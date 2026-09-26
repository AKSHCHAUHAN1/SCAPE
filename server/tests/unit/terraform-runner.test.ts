import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

let failNextCommand = false;

vi.mock('child_process', () => ({
  spawn: vi.fn((_cmd: string, args: string[]) => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const child = Object.assign(new EventEmitter(), {
      stdout,
      stderr,
      kill: vi.fn(),
      pid: 12345,
      killed: false,
    });

    setTimeout(() => {
      if (failNextCommand) {
        stderr.emit('data', Buffer.from('Error: Terraform execution error\n'));
        child.emit('close', 1);
      } else {
        if (args.includes('output')) {
          stdout.emit('data', Buffer.from(JSON.stringify({
            service_endpoint: { value: 'http://test-alb.amazonaws.com' },
            repository_url: { value: '123456.dkr.ecr.ap-south-1.amazonaws.com/test' },
          })));
        } else {
          stdout.emit('data', Buffer.from('Command executed successfully.\n'));
        }
        child.emit('close', 0);
      }
    }, 5);

    return child;
  }),
}));

vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/modules/provisioning/log-sanitizer.js', () => ({
  sanitizeTerraformLogs: vi.fn((logs: string) => logs),
}));

vi.mock('../../src/modules/provisioning/state-manager.js', () => ({
  getBackendConfigArgs: vi.fn(() => [
    '-backend-config=bucket=test-bucket',
    '-backend-config=key=scape-tf-state/test-service/terraform.tfstate',
    '-backend-config=region=ap-south-1',
  ]),
}));

import { TerraformRunner } from '../../src/modules/provisioning/terraform-runner.js';

describe('TerraformRunner', () => {
  let runner: TerraformRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    failNextCommand = false;
    runner = new TerraformRunner('terraform/modules/nodejs-api');
  });

  it('instantiates properly with given module path', () => {
    expect(runner).toBeDefined();
  });

  it('runs apply successfully and returns outputs and logs', async () => {
    const result = await runner.apply('svc-123', { service_name: 'test' }, {});

    expect(result.success).toBe(true);
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.service_endpoint?.value).toBe('http://test-alb.amazonaws.com');
    expect(result.logs).toContain('Command executed successfully.');
  });

  it('runs destroy command successfully', async () => {
    const result = await runner.destroy('svc-123', { service_name: 'test' }, {});

    expect(result.success).toBe(true);
    expect(result.logs).toContain('Command executed successfully.');
  });

  it('handles command failure gracefully without throwing uncaught exception', async () => {
    failNextCommand = true;
    const result = await runner.apply('svc-fail', { service_name: 'fail' }, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
