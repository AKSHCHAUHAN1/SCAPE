import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { query } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';

function verifySignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function handleGitHubWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const event = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && !verifySignature(JSON.stringify(req.body), signature, secret)) {
      logger.warn('GitHub webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    if (event === 'ping') {
      return res.status(200).json({ message: 'pong' });
    }

    if (event === 'workflow_run') {
      const { workflow_run, repository } = req.body;
      if (!workflow_run || !repository) {
        return res.status(400).json({ error: 'Missing workflow_run or repository in payload' });
      }

      const runId = String(workflow_run.id);
      const commitSha = workflow_run.head_sha;
      const branch = workflow_run.head_branch || 'main';
      const conclusion = workflow_run.conclusion; // success, failure, null
      const status = workflow_run.status; // completed, in_progress, queued

      let deploymentStatus = 'pending';
      if (status === 'in_progress') deploymentStatus = 'running';
      else if (status === 'completed') {
        deploymentStatus = conclusion === 'success' ? 'succeeded' : 'failed';
      }

      // Find matching service by repository url or name
      const serviceRes = await query(
        `SELECT id, owner_id FROM services 
         WHERE repository_url ILIKE $1 OR name ILIKE $2 
         LIMIT 1`,
        [`%${repository.name}%`, repository.name],
      );

      if (serviceRes.rowCount && serviceRes.rowCount > 0) {
        const service = serviceRes.rows[0];

        // Check if deployment record for this run already exists
        const existing = await query(
          `SELECT id FROM deployments WHERE github_run_id = $1`,
          [runId],
        );

        if (existing.rowCount && existing.rowCount > 0) {
          await query(
            `UPDATE deployments 
             SET status = $1, 
                 completed_at = CASE WHEN $1 IN ('succeeded', 'failed') THEN NOW() ELSE completed_at END
             WHERE github_run_id = $2`,
            [deploymentStatus, runId],
          );
        } else {
          await query(
            `INSERT INTO deployments (service_id, triggered_by, github_run_id, status, commit_sha, branch, started_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [service.id, service.owner_id, runId, deploymentStatus, commitSha, branch],
          );
        }

        await logAction({
          actorId: service.owner_id,
          action: `deployment.${deploymentStatus}`,
          resourceType: 'deployment',
          resourceId: runId,
          payload: { repository: repository.name, branch, commitSha, conclusion },
        });
      }

      return res.status(200).json({ received: true, status: deploymentStatus });
    }

    return res.status(200).json({ received: true, ignoredEvent: event });
  } catch (err) {
    next(err);
  }
}
