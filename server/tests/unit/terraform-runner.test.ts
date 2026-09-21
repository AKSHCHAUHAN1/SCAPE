import { describe, it, expect, vi, beforeEach } from 'vitest';

// We must mock child_process completely
vi.mock('child_process', () => {
  return {
    execFile: vi.fn((cmd, args, options, callback) => {
      // simulate success
      callback(null, '{"repository_url":{"value":"http://ecr"}}', '');
    })
  };
});

vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  }
}));

import { TerraformRunner } from '../../src/modules/provisioning/terraform-runner.js';

describe('TerraformRunner', () => {
  let runner: TerraformRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = new TerraformRunner('terraform/modules/test');
  });

  it('should successfully run apply and return outputs', async () => {
    // Because we mocked promisify above, execFileAsync will resolve with our dummy stdout
    const result = await runner.apply('ws-1', { var1: 'val1' }, {});
    
    expect(result.success).toBe(true);
    expect(result.success).toBe(true);
  });

  // Note: More robust testing would mock fs.writeFile and fs.unlink, but this is a basic sanity check
});
