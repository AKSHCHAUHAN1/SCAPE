/**
 * Webhook Controller
 * Spec: 08-CICD-Integration
 *
 * Receives GitHub webhook events and processes them:
 * - HMAC-SHA256 signature verification on every event
 * - workflow_run events → create/update deployment records
 * - push events → log for audit trail
 * - ping events → respond with pong
 *
 * Non-functional: webhook processing < 500ms
 * Security: HMAC mismatch → 401 and audit log
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { query } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';
import { config } from '../../config/index.js';

// ---------------------------------------------------------------------------
// HMAC Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature of a GitHub webhook payload.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifySignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'utf-8'),
      Buffer.from(signature, 'utf-8'),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Middleware: Raw Body Capture
// ---------------------------------------------------------------------------

/**
 * Express middleware that captures the raw request body for HMAC verification.
 * Must be mounted BEFORE express.json() for the webhook route, or we use
 * the JSON.stringify approach as fallback.
 */
export function captureRawBody(req: Request, _res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });

  req.on('error', (err) => {
    next(err);
  });
}

// ---------------------------------------------------------------------------
// Webhook Handler
// ---------------------------------------------------------------------------

export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startTime = Date.now();

  try {
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    const secret = config.github.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;

    // ── Signature verification ──
    if (secret) {
      // Use raw body if available, otherwise fall back to JSON.stringify
      const payload = (req as any).rawBody || JSON.stringify(req.body);

      if (!verifySignature(payload, signature, secret)) {
        logger.warn(
          { deliveryId, event, ip: req.ip },
          'GitHub webhook HMAC signature verification failed',
        );

        await logAction({
          actorId: 'system',
          action: 'webhook.signature_failed',
          resourceType: 'webhook',
          resourceId: deliveryId || 'unknown',
          payload: { event, ip: req.ip },
        });

        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    logger.debug({ event, deliveryId }, 'GitHub webhook received');

    // ── Event routing ──
    switch (event) {
      case 'ping':
        return res.status(200).json({ message: 'pong' });

      case 'workflow_run':
        return await handleWorkflowRunEvent(req, res, deliveryId);

      case 'push':
        return await handlePushEvent(req, res, deliveryId);

      default:
        logger.debug({ event }, 'Ignoring unhandled webhook event');
        return res.status(200).json({ received: true, ignoredEvent: event });
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error({ err, durationMs }, 'Webhook processing error');
    next(err);
  }
}

// ---------------------------------------------------------------------------
// workflow_run Event Handler
// ---------------------------------------------------------------------------

async function handleWorkflowRunEvent(
  req: Request,
  res: Response,
  deliveryId: string,
) {
  const { workflow_run, repository } = req.body;

  if (!workflow_run || !repository) {
    return res.status(400).json({ error: 'Missing workflow_run or repository in payload' });
  }

  const runId = String(workflow_run.id);
  const commitSha = workflow_run.head_sha;
  const branch = workflow_run.head_branch || 'main';
  const conclusion = workflow_run.conclusion; // success, failure, null
  const status = workflow_run.status; // completed, in_progress, queued

  // Map GitHub status to SCAPE deployment status
  let deploymentStatus = 'pending';
  if (status === 'in_progress') {
    deploymentStatus = 'running';
  } else if (status === 'completed') {
    deploymentStatus = conclusion === 'success' ? 'succeeded' : 'failed';
  }

  // Find matching service by repository URL or name
  const serviceRes = await query(
    `SELECT id, owner_id FROM services
     WHERE repository_url ILIKE $1 OR repository_url ILIKE $2
     LIMIT 1`,
    [`%${repository.full_name}%`, `%${repository.name}%`],
  );

  if (!serviceRes.rowCount || serviceRes.rowCount === 0) {
    logger.debug(
      { repoName: repository.name, runId },
      'No matching service found for webhook event',
    );
    return res.status(200).json({ received: true, matched: false });
  }

  const service = serviceRes.rows[0];

  // Check if deployment record for this run already exists
  const existing = await query(
    'SELECT id FROM deployments WHERE github_run_id = $1',
    [runId],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    // Update existing record
    await query(
      `UPDATE deployments
       SET status = $1,
           commit_sha = COALESCE($3, commit_sha),
           completed_at = CASE WHEN $1 IN ('succeeded', 'failed') THEN NOW() ELSE completed_at END
       WHERE github_run_id = $2`,
      [deploymentStatus, runId, commitSha],
    );
  } else {
    // Create new deployment record
    await query(
      `INSERT INTO deployments
         (service_id, triggered_by, github_run_id, status, commit_sha, branch, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [service.id, service.owner_id, runId, deploymentStatus, commitSha, branch],
    );
  }

  await logAction({
    actorId: service.owner_id,
    action: `deployment.${deploymentStatus}`,
    resourceType: 'deployment',
    resourceId: runId,
    payload: {
      deliveryId,
      repository: repository.full_name,
      branch,
      commitSha,
      conclusion,
      workflowName: workflow_run.name,
    },
  });

  return res.status(200).json({
    received: true,
    status: deploymentStatus,
    serviceId: service.id,
  });
}

// ---------------------------------------------------------------------------
// push Event Handler
// ---------------------------------------------------------------------------

async function handlePushEvent(
  req: Request,
  res: Response,
  deliveryId: string,
) {
  const { repository, ref, after, pusher } = req.body;

  if (!repository) {
    return res.status(400).json({ error: 'Missing repository in payload' });
  }

  // Only log push events for audit — deployment tracking is handled by workflow_run
  const branch = ref?.replace('refs/heads/', '') || 'unknown';

  // Find matching service
  const serviceRes = await query(
    `SELECT id, owner_id FROM services
     WHERE repository_url ILIKE $1 OR repository_url ILIKE $2
     LIMIT 1`,
    [`%${repository.full_name}%`, `%${repository.name}%`],
  );

  if (serviceRes.rowCount && serviceRes.rowCount > 0) {
    const service = serviceRes.rows[0];

    await logAction({
      actorId: service.owner_id,
      action: 'push.received',
      resourceType: 'service',
      resourceId: service.id,
      payload: {
        deliveryId,
        repository: repository.full_name,
        branch,
        commitSha: after,
        pusher: pusher?.name || 'unknown',
      },
    });
  }

  return res.status(200).json({ received: true, event: 'push' });
}
