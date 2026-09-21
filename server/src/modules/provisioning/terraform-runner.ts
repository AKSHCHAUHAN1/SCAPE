import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

export interface TerraformRunResult {
  success: boolean;
  outputs?: Record<string, { value: any }>;
  error?: string;
}

/**
 * Run Terraform commands for a given module and workspace.
 */
export class TerraformRunner {
  private moduleDir: string;

  constructor(modulePath: string) {
    // Determine absolute path to the terraform module
    // The module_path in DB is like 'terraform/modules/nodejs-api'
    // We assume the root of the project is two levels up from server/src
    this.moduleDir = path.resolve(process.cwd(), '..', modulePath);
  }

  /**
   * Run terraform init, workspace select, apply.
   */
  async apply(
    workspace: string,
    variables: Record<string, any>,
    env: NodeJS.ProcessEnv,
  ): Promise<TerraformRunResult> {
    try {
      await this.init(env);
      await this.selectOrNewWorkspace(workspace, env);
      
      // Write variables to a temporary tfvars file
      const varsPath = path.join(this.moduleDir, `${workspace}.auto.tfvars.json`);
      await fs.writeFile(varsPath, JSON.stringify(variables, null, 2));

      try {
        await this.exec('apply', ['-auto-approve', '-json'], env);
        
        // Get outputs
        const outputResult = await this.exec('output', ['-json'], env);
        const outputs = JSON.parse(outputResult.stdout || '{}');
        
        return { success: true, outputs };
      } finally {
        // Cleanup the temporary vars file
        await fs.unlink(varsPath).catch((err) => logger.error({ err }, 'Failed to delete temporary tfvars file'));
      }
    } catch (err: any) {
      logger.error({ err, workspace }, 'Terraform apply failed');
      return { success: false, error: this.parseTerraformError(err.stdout || err.message) };
    }
  }

  /**
   * Run terraform destroy.
   */
  async destroy(workspace: string, env: NodeJS.ProcessEnv): Promise<TerraformRunResult> {
    try {
      await this.init(env);
      await this.selectOrNewWorkspace(workspace, env);

      await this.exec('destroy', ['-auto-approve', '-json'], env);
      
      return { success: true };
    } catch (err: any) {
      logger.error({ err, workspace }, 'Terraform destroy failed');
      return { success: false, error: this.parseTerraformError(err.stdout || err.message) };
    }
  }

  private async init(env: NodeJS.ProcessEnv) {
    // Only init if .terraform directory is missing, or simply run init each time.
    // In a production setup, we might want to optimize this.
    // For now, running init ensures the state backend is configured correctly.
    await this.exec('init', ['-input=false'], env);
  }

  private async selectOrNewWorkspace(workspace: string, env: NodeJS.ProcessEnv) {
    try {
      await this.exec('workspace', ['select', workspace], env);
    } catch (err) {
      // Workspace doesn't exist, create it
      await this.exec('workspace', ['new', workspace], env);
    }
  }

  private async exec(command: string, args: string[], env: NodeJS.ProcessEnv) {
    const defaultEnv = {
      ...process.env,
      ...env,
      TF_IN_AUTOMATION: 'true',
    };

    return execFileAsync('terraform', [command, ...args], {
      cwd: this.moduleDir,
      env: defaultEnv,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for output
    });
  }

  private parseTerraformError(output: string): string {
    // Extract meaningful error messages from JSON output or raw text
    try {
      const lines = output.split('\n').filter((l) => l.trim().length > 0);
      const errors = lines
        .map((l) => {
          try {
            const parsed = JSON.parse(l);
            if (parsed.type === 'diagnostic' && parsed.diagnostic?.severity === 'error') {
              return parsed.diagnostic.summary + (parsed.diagnostic.detail ? ': ' + parsed.diagnostic.detail : '');
            }
          } catch {
            // Not JSON, ignore
          }
          return null;
        })
        .filter((e) => e !== null);

      if (errors.length > 0) {
        return errors.join('; ');
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return output;
  }
}
