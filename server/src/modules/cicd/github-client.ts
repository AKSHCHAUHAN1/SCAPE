/**
 * GitHub Client
 * Spec: 08-CICD-Integration
 *
 * Provides GitHub API operations for the CI/CD integration:
 * - Commit workflow files to repositories
 * - Register webhooks on new repositories
 * - Retry logic with exponential backoff for 429/5xx errors
 *
 * ADR-019: GitHub App over PAT for per-repo fine-grained permissions
 * ADR-020: Commit workflow file over GitHub Actions API
 */

import { Octokit } from '@octokit/rest';
import crypto from 'node:crypto';
import { logger } from '../../utils/logger.js';
import { createAuthenticatedOctokit } from './github-app-auth.js';
import type {
  GitHubCommitPayload,
  GitHubCommitResult,
  WebhookRegistrationPayload,
  WebhookRegistrationResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Execute a GitHub API call with exponential backoff on 429/5xx.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const status = err.status || err.response?.status;

      // Only retry on 429 (rate limit) or 5xx (server error)
      if (attempt < MAX_RETRIES && (status === 429 || (status >= 500 && status < 600))) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(
          { attempt: attempt + 1, maxRetries: MAX_RETRIES, delay, status, label },
          `GitHub API ${label} failed (${status}), retrying after ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// GitHub Integrator
// ---------------------------------------------------------------------------

export class GitHubIntegrator {
  private octokitPromise: Promise<Octokit | null>;

  constructor() {
    this.octokitPromise = createAuthenticatedOctokit();
  }

  /**
   * Parse GitHub owner and repo from repository URL.
   * Supports: https://github.com/org/repo.git, git@github.com:org/repo.git
   */
  parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
    try {
      const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
      if (!match) return null;
      return { owner: match[1], repo: match[2] };
    } catch {
      return null;
    }
  }

  /**
   * Commit a workflow file to a repository.
   * If the file already exists, it updates it (PUT with existing SHA).
   *
   * Non-functional: must complete within 10s (enforced by caller).
   */
  async commitWorkflowFile(payload: GitHubCommitPayload): Promise<GitHubCommitResult> {
    const filePath = payload.filePath || '.github/workflows/deploy.yml';
    const message = payload.commitMessage || 'ci: add SCAPE automated deployment workflow';
    const parsed = this.parseRepoUrl(payload.repoUrl);
    const octokit = await this.octokitPromise;

    if (!parsed || !octokit) {
      logger.info(
        { repoUrl: payload.repoUrl, filePath },
        'GitHub integration in simulation mode (no token configured or invalid repo URL)',
      );
      return {
        success: true,
        sha: 'simulated-commit-sha-' + Date.now().toString(16),
        message: 'Workflow file generated in simulation mode',
      };
    }

    return withRetry(async () => {
      // Check if file already exists (to get SHA for update)
      let existingSha: string | undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePath,
        });
        if ('sha' in fileData) {
          existingSha = fileData.sha;
        }
      } catch {
        // File does not exist — initial commit
      }

      const res = await octokit.repos.createOrUpdateFileContents({
        owner: parsed.owner,
        repo: parsed.repo,
        path: filePath,
        message,
        content: Buffer.from(payload.content).toString('base64'),
        sha: existingSha,
        branch: payload.branch || undefined,
      });

      logger.info(
        { repo: `${parsed.owner}/${parsed.repo}`, filePath, sha: res.data.commit.sha },
        'Workflow file committed successfully',
      );

      return {
        success: true,
        sha: res.data.commit.sha,
        message: 'Workflow successfully committed to repository',
      };
    }, 'commitWorkflowFile');
  }

  /**
   * Register a webhook on a repository to receive workflow_run and push events.
   *
   * The webhook secret is used for HMAC-SHA256 signature verification.
   */
  async registerWebhook(payload: WebhookRegistrationPayload): Promise<WebhookRegistrationResult> {
    const parsed = this.parseRepoUrl(payload.repoUrl);
    const octokit = await this.octokitPromise;

    if (!parsed || !octokit) {
      logger.info(
        { repoUrl: payload.repoUrl },
        'Webhook registration in simulation mode',
      );
      return {
        success: true,
        hookId: 0,
        message: 'Webhook registered in simulation mode',
      };
    }

    return withRetry(async () => {
      // Check if webhook already exists for this URL
      try {
        const { data: hooks } = await octokit.repos.listWebhooks({
          owner: parsed.owner,
          repo: parsed.repo,
        });

        const existing = hooks.find(
          (h) => h.config.url === payload.webhookUrl,
        );

        if (existing) {
          // Update existing webhook
          const { data: updated } = await octokit.repos.updateWebhook({
            owner: parsed.owner,
            repo: parsed.repo,
            hook_id: existing.id,
            config: {
              url: payload.webhookUrl,
              content_type: 'json',
              secret: payload.secret,
              insecure_ssl: '0',
            },
            events: payload.events,
            active: true,
          });

          logger.info(
            { repo: `${parsed.owner}/${parsed.repo}`, hookId: updated.id },
            'Webhook updated successfully',
          );

          return {
            success: true,
            hookId: updated.id,
            message: 'Existing webhook updated',
          };
        }
      } catch (err: any) {
        // If listing fails (e.g., 404), proceed to create
        logger.debug({ err: err.message }, 'Could not list existing webhooks, creating new one');
      }

      // Create new webhook
      const { data: hook } = await octokit.repos.createWebhook({
        owner: parsed.owner,
        repo: parsed.repo,
        config: {
          url: payload.webhookUrl,
          content_type: 'json',
          secret: payload.secret,
          insecure_ssl: '0',
        },
        events: payload.events,
        active: true,
      });

      logger.info(
        { repo: `${parsed.owner}/${parsed.repo}`, hookId: hook.id },
        'Webhook registered successfully',
      );

      return {
        success: true,
        hookId: hook.id,
        message: 'Webhook registered successfully',
      };
    }, 'registerWebhook');
  }

  /**
   * Generate a SHA-256 hash of workflow content for audit purposes.
   */
  static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
