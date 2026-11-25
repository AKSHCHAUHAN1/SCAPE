import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { logAction } from '../../src/modules/audit/audit.service.js';

// Mock DB
const mockQuery = vi.fn();
vi.mock('../../src/database/index.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock audit logger
vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('../../src/config/index.js', () => ({
  config: {
    github: {
      webhookSecret: 'test-secret-key-12345',
    },
  },
}));

import { handleGitHubWebhook } from '../../src/modules/cicd/webhook.controller.js';

function computeSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(payload).digest('hex');
}

describe('WebhookController', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
      body: {},
      ip: '127.0.0.1',
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('rejects webhooks with invalid HMAC signature with 401', async () => {
    const payload = JSON.stringify({ action: 'ping' });
    req.headers['x-github-event'] = 'ping';
    req.headers['x-hub-signature-256'] = 'sha256=invalidhashvalue';
    req.rawBody = Buffer.from(payload);
    req.body = { action: 'ping' };

    await handleGitHubWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid webhook signature' }));
  });

  it('handles ping event with 200 pong when signature is valid', async () => {
    const payload = JSON.stringify({ zen: 'Keep it logically awesome.' });
    const signature = computeSignature(payload, 'test-secret-key-12345');

    req.headers['x-github-event'] = 'ping';
    req.headers['x-hub-signature-256'] = signature;
    req.rawBody = Buffer.from(payload);
    req.body = JSON.parse(payload);

    await handleGitHubWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'pong' });
  });

  it('handles workflow_run completed event and creates deployment record', async () => {
    const body = {
      workflow_run: {
        id: 998877,
        head_sha: 'abc123def456',
        head_branch: 'main',
        conclusion: 'success',
        status: 'completed',
        name: 'Deploy',
      },
      repository: {
        name: 'test-app',
        full_name: 'test-org/test-app',
        html_url: 'https://github.com/test-org/test-app',
      },
    };
    const payload = JSON.stringify(body);
    const signature = computeSignature(payload, 'test-secret-key-12345');

    req.headers['x-github-event'] = 'workflow_run';
    req.headers['x-hub-signature-256'] = signature;
    req.rawBody = Buffer.from(payload);
    req.body = body;

    // Service lookup match
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'svc-001', owner_id: 'user-001' }],
    });
    // Check existing deployment: none
    mockQuery.mockResolvedValueOnce({
      rowCount: 0,
      rows: [],
    });
    // No manual pending deployment matches this workflow run.
    mockQuery.mockResolvedValueOnce({
      rowCount: 0,
      rows: [],
    });
    // Insert the GitHub run as a deployment.
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'dep-001' }],
    });

    await handleGitHubWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        received: true,
        status: 'succeeded',
        serviceId: 'svc-001',
      }),
    );
  });

  it('updates a pending deployment with an enum-safe status and audits its UUID', async () => {
    const deploymentId = '90000000-0000-4000-8000-000000000001';
    const body = {
      workflow_run: {
        id: 998878,
        head_sha: 'fedcba987654',
        head_branch: 'main',
        conclusion: 'success',
        status: 'completed',
        name: 'Deploy',
      },
      repository: {
        name: 'test-app',
        full_name: 'test-org/test-app',
        html_url: 'https://github.com/test-org/test-app',
      },
    };
    const payload = JSON.stringify(body);

    req.headers['x-github-event'] = 'workflow_run';
    req.headers['x-hub-signature-256'] = computeSignature(payload, 'test-secret-key-12345');
    req.rawBody = Buffer.from(payload);
    req.body = body;

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '80000000-0000-4000-8000-000000000001', owner_id: '70000000-0000-4000-8000-000000000001' }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: deploymentId }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await handleGitHubWebhook(req, res, next);

    const updateSql = mockQuery.mock.calls[3][0] as string;
    expect(updateSql).toContain('status = $2::deployment_status');
    expect(updateSql).toContain("$2::deployment_status = 'running'::deployment_status");
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'deployment.succeeded',
      resourceId: deploymentId,
    }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updates an existing run with an enum-safe status and audits its UUID', async () => {
    const deploymentId = '90000000-0000-4000-8000-000000000002';
    const body = {
      workflow_run: {
        id: 998879,
        head_sha: '0123456789ab',
        head_branch: 'main',
        conclusion: 'failure',
        status: 'completed',
        name: 'Deploy',
      },
      repository: {
        name: 'test-app',
        full_name: 'test-org/test-app',
        html_url: 'https://github.com/test-org/test-app',
      },
    };
    const payload = JSON.stringify(body);

    req.headers['x-github-event'] = 'workflow_run';
    req.headers['x-hub-signature-256'] = computeSignature(payload, 'test-secret-key-12345');
    req.rawBody = Buffer.from(payload);
    req.body = body;

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '80000000-0000-4000-8000-000000000002', owner_id: '70000000-0000-4000-8000-000000000002' }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: deploymentId }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await handleGitHubWebhook(req, res, next);

    const updateSql = mockQuery.mock.calls[2][0] as string;
    expect(updateSql).toContain('status = $1::deployment_status');
    expect(updateSql).toContain("$1::deployment_status IN ('succeeded'::deployment_status, 'failed'::deployment_status)");
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'deployment.failed',
      resourceId: deploymentId,
    }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
