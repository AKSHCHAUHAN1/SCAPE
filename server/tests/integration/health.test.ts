import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/database/index.js';

describe('Health Endpoints - Integration Tests', () => {
  it('GET /health should return 200 with service details', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'scape-api',
    });
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /health/ready should return database connectivity status', async () => {
    // Mock successful pool query for ready check
    const poolSpy = vi.spyOn(pool, 'query').mockImplementationOnce(() => Promise.resolve({ rows: [{ '?column?': 1 }] } as any));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBe('ok');

    poolSpy.mockRestore();
  });

  it('GET /health/ready should return 503 degraded when database query fails', async () => {
    const poolSpy = vi.spyOn(pool, 'query').mockImplementationOnce(() => Promise.reject(new Error('Connection refused')));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database).toBe('unreachable');

    poolSpy.mockRestore();
  });
});
