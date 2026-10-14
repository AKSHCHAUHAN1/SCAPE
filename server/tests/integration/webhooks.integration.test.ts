import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import app from '../../src/app.js';
import { config } from '../../src/config/index.js';
import * as auditService from '../../src/modules/audit/audit.service.js';

describe('GitHub Webhooks - Integration Tests', () => {
  const TEST_SECRET = 'test-webhook-secret-key-123';
  let originalSecret: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(auditService, 'logAction').mockResolvedValue(undefined as any);
    originalSecret = config.github.webhookSecret;
    (config.github as any).webhookSecret = TEST_SECRET;
  });

  afterEach(() => {
    (config.github as any).webhookSecret = originalSecret;
  });

  it('returns 401 when x-hub-signature-256 header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'ping')
      .send({ zen: 'Keep it logically awesome.' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid webhook signature');
  });

  it('returns 401 when signature is invalid', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'ping')
      .set('x-hub-signature-256', 'sha256=invalid-signature')
      .send({ zen: 'Keep it logically awesome.' });

    expect(res.status).toBe(401);
  });

  it('returns 200 pong for ping event with valid HMAC-SHA256 signature', async () => {
    const payload = JSON.stringify({ zen: 'Approachable is better than simple.' });
    const signature =
      'sha256=' +
      crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

    const res = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'ping')
      .set('x-hub-signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'pong');
  });
});
