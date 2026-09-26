/**
 * Terraform Runner
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * Executes Terraform CLI commands (init, apply, destroy, output) as
 * child processes with:
 * - Configurable timeouts (SIGTERM → SIGKILL)
 * - Full stdout/stderr capture for log persistence
 * - Provider plugin cache for faster init
 * - JSON output parsing via `-json` flag
 * - Workspace isolation per service
 * - Backend config injection for S3 remote state
 *
 * ADR-016: Terraform CLI runner over Terraform Cloud API
 * ADR-017: One workspace per service for state isolation
 * ADR-018: -json flag for machine-readable output parsing
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { logger } from '../../utils/logger.js';
import { sanitizeTerraformLogs } from './log-sanitizer.js';
import { getBackendConfigArgs } from './state-manager.js';
import type { TerraformRunResult, TerraformJsonLine } from './types.js';
import { APPLY_TIMEOUT_MS, DESTROY_TIMEOUT_MS, INIT_TIMEOUT_MS } from './types.js';

// ---------------------------------------------------------------------------
// Plugin cache directory (shared across runs for performance)
// ---------------------------------------------------------------------------

const PLUGIN_CACHE_DIR = path.join(os.tmpdir(), 'scape-terraform-plugin-cache');

/**
 * Ensure the plugin cache directory exists.
 */
async function ensurePluginCacheDir(): Promise<void> {
  await fs.mkdir(PLUGIN_CACHE_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Terraform Runner Options
// ---------------------------------------------------------------------------

export interface TerraformRunOptions {
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Terraform Runner Class
// ---------------------------------------------------------------------------

export class TerraformRunner {
  private moduleDir: string;

  constructor(modulePath: string) {
    // Determine absolute path to the terraform module.
    // The module_path in DB is like 'terraform/modules/nodejs-api'
    // We assume the root of the project is two levels up from server/src
    this.moduleDir = path.resolve(process.cwd(), '..', modulePath);
  }

  /**
   * Run terraform init, workspace select, and apply.
   */
  async apply(
    workspace: string,
    variables: Record<string, any>,
    env: NodeJS.ProcessEnv,
    options?: TerraformRunOptions,
  ): Promise<TerraformRunResult> {
    const startTime = Date.now();
    const allLogs: string[] = [];

    try {
      // 1. Init with backend config
      const initResult = await this.init(workspace, env);
      allLogs.push('=== TERRAFORM INIT ===\n' + initResult.logs);

      // 2. Select or create workspace
      const wsResult = await this.selectOrNewWorkspace(workspace, env);
      allLogs.push('=== WORKSPACE SELECT ===\n' + wsResult.logs);

      // 3. Write variables to temporary tfvars file
      const varsPath = path.join(this.moduleDir, `${workspace}.auto.tfvars.json`);
      await fs.writeFile(varsPath, JSON.stringify(variables, null, 2));

      try {
        // 4. Apply with JSON output
        const applyResult = await this.exec(
          'apply',
          ['-auto-approve', '-json', '-input=false'],
          env,
          options?.timeoutMs ?? APPLY_TIMEOUT_MS,
        );
        allLogs.push('=== TERRAFORM APPLY ===\n' + applyResult.combined);

        // 5. Get outputs
        const outputResult = await this.exec('output', ['-json'], env, INIT_TIMEOUT_MS);
        const outputs = JSON.parse(outputResult.stdout || '{}');

        return {
          success: true,
          outputs,
          logs: sanitizeTerraformLogs(allLogs.join('\n\n')),
          durationMs: Date.now() - startTime,
        };
      } finally {
        // Cleanup the temporary vars file
        await fs.unlink(varsPath).catch((err) =>
          logger.warn({ err: err.message }, 'Failed to delete temporary tfvars file'),
        );
      }
    } catch (err: any) {
      allLogs.push('=== ERROR ===\n' + (err.logs || err.message));

      logger.error({ err: err.message, workspace }, 'Terraform apply failed');
      return {
        success: false,
        error: this.parseTerraformError(err.stdout || err.logs || err.message),
        logs: sanitizeTerraformLogs(allLogs.join('\n\n')),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Run terraform destroy with timeout.
   */
  async destroy(
    workspace: string,
    env: NodeJS.ProcessEnv,
    options?: TerraformRunOptions,
  ): Promise<TerraformRunResult> {
    const startTime = Date.now();
    const allLogs: string[] = [];

    try {
      const initResult = await this.init(workspace, env);
      allLogs.push('=== TERRAFORM INIT (DESTROY) ===\n' + initResult.logs);

      const wsResult = await this.selectOrNewWorkspace(workspace, env);
      allLogs.push('=== WORKSPACE SELECT (DESTROY) ===\n' + wsResult.logs);

      const destroyResult = await this.exec(
        'destroy',
        ['-auto-approve', '-json', '-input=false'],
        env,
        options?.timeoutMs ?? DESTROY_TIMEOUT_MS,
      );
      allLogs.push('=== TERRAFORM DESTROY ===\n' + destroyResult.combined);

      return {
        success: true,
        logs: sanitizeTerraformLogs(allLogs.join('\n\n')),
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      allLogs.push('=== DESTROY ERROR ===\n' + (err.logs || err.message));

      logger.error({ err: err.message, workspace }, 'Terraform destroy failed');
      return {
        success: false,
        error: this.parseTerraformError(err.stdout || err.logs || err.message),
        logs: sanitizeTerraformLogs(allLogs.join('\n\n')),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Run terraform plan (for preview).
   */
  async plan(
    workspace: string,
    variables: Record<string, any>,
    env: NodeJS.ProcessEnv,
  ): Promise<TerraformRunResult> {
    const startTime = Date.now();

    try {
      await this.init(workspace, env);
      await this.selectOrNewWorkspace(workspace, env);

      const varsPath = path.join(this.moduleDir, `${workspace}.auto.tfvars.json`);
      await fs.writeFile(varsPath, JSON.stringify(variables, null, 2));

      try {
        const planResult = await this.exec(
          'plan',
          ['-json', '-input=false'],
          env,
          APPLY_TIMEOUT_MS,
        );

        return {
          success: true,
          planOutput: sanitizeTerraformLogs(planResult.combined),
          logs: sanitizeTerraformLogs(planResult.combined),
          durationMs: Date.now() - startTime,
        };
      } finally {
        await fs.unlink(varsPath).catch(() => {});
      }
    } catch (err: any) {
      return {
        success: false,
        error: this.parseTerraformError(err.stdout || err.message),
        durationMs: Date.now() - startTime,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * terraform init with backend config and plugin cache.
   */
  private async init(
    serviceId: string,
    env: NodeJS.ProcessEnv,
  ): Promise<{ logs: string }> {
    await ensurePluginCacheDir();

    const backendArgs = getBackendConfigArgs(serviceId);
    const result = await this.exec(
      'init',
      ['-input=false', '-reconfigure', ...backendArgs],
      env,
      INIT_TIMEOUT_MS,
    );

    return { logs: result.combined };
  }

  /**
   * Select existing workspace or create a new one.
   */
  private async selectOrNewWorkspace(
    workspace: string,
    env: NodeJS.ProcessEnv,
  ): Promise<{ logs: string }> {
    try {
      const result = await this.exec('workspace', ['select', workspace], env, 30_000);
      return { logs: result.combined };
    } catch {
      const result = await this.exec('workspace', ['new', workspace], env, 30_000);
      return { logs: result.combined };
    }
  }

  /**
   * Execute a Terraform command as a child process with timeout handling.
   *
   * Timeout strategy:
   * 1. Send SIGTERM after timeoutMs
   * 2. If process doesn't exit within 10s, send SIGKILL
   */
  private exec(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
  ): Promise<{ stdout: string; stderr: string; combined: string }> {
    return new Promise((resolve, reject) => {
      const childEnv = {
        ...process.env,
        ...env,
        TF_IN_AUTOMATION: 'true',
        TF_PLUGIN_CACHE_DIR: PLUGIN_CACHE_DIR,
      };

      const child: ChildProcess = spawn('terraform', [command, ...args], {
        cwd: this.moduleDir,
        env: childEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      let killed = false;
      let killReason = '';

      // Timeout: SIGTERM first, then SIGKILL after 10s
      const timer = setTimeout(() => {
        killed = true;
        killReason = `Terraform ${command} timed out after ${timeoutMs}ms`;
        logger.warn({ command, timeoutMs }, killReason);

        child.kill('SIGTERM');

        // Force kill after 10 seconds if still alive
        setTimeout(() => {
          if (!child.killed) {
            logger.warn({ command }, 'Terraform process did not exit after SIGTERM, sending SIGKILL');
            child.kill('SIGKILL');
          }
        }, 10_000);
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);

        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');
        const combined = stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '');

        if (killed) {
          const err = new Error(killReason) as any;
          err.stdout = stdout;
          err.stderr = stderr;
          err.logs = combined;
          err.code = code;
          reject(err);
          return;
        }

        if (code !== 0) {
          const err = new Error(`terraform ${command} exited with code ${code}`) as any;
          err.stdout = stdout;
          err.stderr = stderr;
          err.logs = combined;
          err.code = code;
          reject(err);
          return;
        }

        resolve({ stdout, stderr, combined });
      });

      child.on('error', (err: any) => {
        clearTimeout(timer);
        err.logs = '';
        reject(err);
      });
    });
  }

  /**
   * Parse Terraform JSON output for meaningful error messages.
   * Extracts diagnostic messages with severity=error.
   */
  private parseTerraformError(output: string): string {
    try {
      const lines = output.split('\n').filter((l) => l.trim().length > 0);
      const errors: string[] = [];

      for (const line of lines) {
        try {
          const parsed: TerraformJsonLine = JSON.parse(line);
          if (
            parsed.type === 'diagnostic' &&
            parsed.diagnostic?.severity === 'error'
          ) {
            const msg =
              parsed.diagnostic.summary +
              (parsed.diagnostic.detail ? ': ' + parsed.diagnostic.detail : '');
            errors.push(msg);
          }
        } catch {
          // Not JSON — skip
        }
      }

      if (errors.length > 0) {
        return errors.join('; ');
      }
    } catch {
      // Fall through
    }

    // Truncate raw output if too long
    if (output.length > 2000) {
      return output.slice(0, 2000) + '... [truncated]';
    }

    return output;
  }
}
