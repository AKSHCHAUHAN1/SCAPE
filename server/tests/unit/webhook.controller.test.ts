import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

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
    // Insert new deployment
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
});
