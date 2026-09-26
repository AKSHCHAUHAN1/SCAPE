/**
 * Rollback Coordinator
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * Handles automatic rollback (terraform destroy) when provisioning fails.
 * - Enforces rollback timeout (5 min)
 * - Marks job as manual_intervention_required on rollback failure
 * - Emits structured log events for each state transition
 */

import { query } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';
import { TerraformRunner } from './terraform-runner.js';
import { sanitizeTerraformLogs } from './log-sanitizer.js';
import type { TerraformRunResult } from './types.js';
import { DESTROY_TIMEOUT_MS } from './types.js';

// ---------------------------------------------------------------------------
// Job Status Helpers
// ---------------------------------------------------------------------------

async function updateJobStatus(
  jobId: string,
  status: string,
  extra?: { errorMessage?: string; terraformLogs?: string },
) {
  const fields = ['status = $2'];
  const values: unknown[] = [jobId, status];
  let idx = 3;

  if (['succeeded', 'failed', 'rolled_back', 'manual_intervention_required'].includes(status)) {
    fields.push('completed_at = NOW()');
  }

  if (extra?.errorMessage !== undefined) {
    fields.push(`error_message = $${idx++}`);
    values.push(extra.errorMessage);
  }

  if (extra?.terraformLogs !== undefined) {
    fields.push(`terraform_logs = COALESCE(terraform_logs, '') || $${idx++}`);
    values.push('\n--- ROLLBACK LOGS ---\n' + extra.terraformLogs);
  }

  await query(
    `UPDATE provisioning_jobs SET ${fields.join(', ')} WHERE id = $1`,
    values,
  );
}

async function updateServiceStatus(serviceId: string, status: string) {
  await query(
    `UPDATE services SET status = $2, updated_at = NOW() WHERE id = $1`,
    [serviceId, status],
  );
}

// ---------------------------------------------------------------------------
// Rollback Coordinator
// ---------------------------------------------------------------------------

export interface RollbackContext {
  jobId: string;
  serviceId: string;
  workspace: string;
  modulePath: string;
  awsEnv: NodeJS.ProcessEnv;
  applyError: string;
  triggeredBy: string;
}

/**
 * Execute a coordinated rollback (terraform destroy) for a failed provisioning job.
 *
 * Flow:
 * 1. Log the rollback initiation
 * 2. Run terraform destroy with timeout
 * 3. On success → mark job as rolled_back
 * 4. On failure → mark job as manual_intervention_required
 */
export async function executeRollback(ctx: RollbackContext): Promise<TerraformRunResult> {
  const { jobId, serviceId, workspace, modulePath, awsEnv, applyError, triggeredBy } = ctx;

  logger.warn(
    { jobId, serviceId, workspace },
    'Initiating rollback — terraform destroy',
  );

  const runner = new TerraformRunner(modulePath);

  try {
    const rollbackResult = await runner.destroy(workspace, awsEnv, {
      timeoutMs: DESTROY_TIMEOUT_MS,
    });

    const sanitizedLogs = rollbackResult.logs
      ? sanitizeTerraformLogs(rollbackResult.logs)
      : undefined;

    if (rollbackResult.success) {
      // ── Rollback succeeded ──
      await updateJobStatus(jobId, 'rolled_back', {
        errorMessage: `Provisioning failed: ${applyError}. Rollback completed successfully.`,
        terraformLogs: sanitizedLogs,
      });
      await updateServiceStatus(serviceId, 'failed');

      await logAction({
        actorId: triggeredBy,
        action: 'job.rolled_back',
        resourceType: 'provisioning_job',
        resourceId: jobId,
        payload: { applyError, rollbackDurationMs: rollbackResult.durationMs },
      });

      logger.info({ jobId, serviceId }, 'Rollback completed successfully');
      return rollbackResult;
    }

    // ── Rollback failed — needs manual intervention ──
    const combinedError = `Apply error: ${applyError} | Rollback error: ${rollbackResult.error}`;

    await updateJobStatus(jobId, 'manual_intervention_required', {
      errorMessage: combinedError,
      terraformLogs: sanitizedLogs,
    });
    await updateServiceStatus(serviceId, 'failed');

    await logAction({
      actorId: triggeredBy,
      action: 'job.manual_intervention_required',
      resourceType: 'provisioning_job',
      resourceId: jobId,
      payload: {
        applyError,
        rollbackError: rollbackResult.error,
      },
    });

    logger.error(
      { jobId, serviceId, rollbackError: rollbackResult.error },
      'Rollback FAILED — manual intervention required',
    );

    return rollbackResult;
  } catch (err: any) {
    // ── Unexpected error during rollback ──
    const errorMsg = `Apply error: ${applyError} | Rollback exception: ${err.message}`;

    await updateJobStatus(jobId, 'manual_intervention_required', {
      errorMessage: errorMsg,
    });
    await updateServiceStatus(serviceId, 'failed');

    await logAction({
      actorId: triggeredBy,
      action: 'job.manual_intervention_required',
      resourceType: 'provisioning_job',
      resourceId: jobId,
      payload: { applyError, rollbackException: err.message },
    });

    logger.error(
      { err, jobId, serviceId },
      'Rollback threw unexpected exception — manual intervention required',
    );

    return { success: false, error: err.message };
  }
}
