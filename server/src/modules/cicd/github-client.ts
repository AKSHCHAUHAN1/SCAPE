import { Octokit } from '@octokit/rest';
import { logger } from '../../utils/logger.js';

export class GitHubIntegrator {
  private octokit: Octokit | null = null;

  constructor() {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  /**
   * Parse GitHub owner and repo from repository URL.
   * e.g. https://github.com/myorg/my-service.git -> { owner: 'myorg', repo: 'my-service' }
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
   * Commit workflow file to repository's .github/workflows/deploy.yml
   */
  async commitWorkflowFile(options: {
    repoUrl: string;
    filePath?: string;
    content: string;
    commitMessage?: string;
  }): Promise<{ success: boolean; sha?: string; message: string }> {
    const filePath = options.filePath || '.github/workflows/deploy.yml';
    const message = options.commitMessage || 'ci: add forge automated deployment workflow';
    const parsed = this.parseRepoUrl(options.repoUrl);

    if (!parsed || !this.octokit) {
      logger.info(
        { repoUrl: options.repoUrl, filePath },
        'GitHub integration in simulation mode (no token configured or repo URL is local/mock)',
      );
      return {
        success: true,
        sha: 'simulated-commit-sha-' + Date.now().toString(16),
        message: 'Workflow file generated and queued in simulation mode',
      };
    }

    try {
      let existingSha: string | undefined;
      try {
        const { data: fileData } = await this.octokit.repos.getContent({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePath,
        });
        if ('sha' in fileData) {
          existingSha = fileData.sha;
        }
      } catch {
        // File does not exist yet, which is normal for initial commit
      }

      const res = await this.octokit.repos.createOrUpdateFileContents({
        owner: parsed.owner,
        repo: parsed.repo,
        path: filePath,
        message,
        content: Buffer.from(options.content).toString('base64'),
        sha: existingSha,
      });

      return {
        success: true,
        sha: res.data.commit.sha,
        message: 'Workflow successfully committed to repository',
      };
    } catch (err: any) {
      logger.error({ err: err.message, repoUrl: options.repoUrl }, 'Failed to commit workflow file');
      return {
        success: false,
        message: err.message,
      };
    }
  }
}
