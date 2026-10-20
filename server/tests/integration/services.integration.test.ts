import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { config } from '../../src/config/index.js';
import * as servicesService from '../../src/modules/services/services.service.js';

describe('Services Endpoints - Integration Tests', () => {
  const authToken = jwt.sign(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'dev@scape.dev',
      role: 'developer',
      teamId: '22222222-2222-2222-2222-222222222222',
      tokenUse: 'access',
    },
    config.jwt.privateKey,
    { algorithm: 'RS256', expiresIn: '1h' },
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /services', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app).get('/services');
      expect(res.status).toBe(401);
    });

    it('returns 200 with services list when authenticated', async () => {
      vi.spyOn(servicesService, 'getAllServices').mockResolvedValueOnce([
        {
          id: 'srv-1',
          name: 'payments-api',
          templateId: 'tmpl-1',
          teamId: '22222222-2222-2222-2222-222222222222',
          ownerId: '11111111-1111-1111-1111-111111111111',
          status: 'active',
          region: 'us-east-1',
          repositoryUrl: 'https://github.com/company/payments-api',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ] as any);

      const res = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('name', 'payments-api');
    });
  });

  describe('GET /services/:id', () => {
    it('returns 200 with service details for valid id', async () => {
      vi.spyOn(servicesService, 'getServiceById').mockResolvedValueOnce({
        id: 'srv-1',
        name: 'payments-api',
        templateId: 'tmpl-1',
        teamId: '22222222-2222-2222-2222-222222222222',
        ownerId: '11111111-1111-1111-1111-111111111111',
        status: 'active',
        region: 'us-east-1',
        repositoryUrl: 'https://github.com/company/payments-api',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const res = await request(app)
        .get('/services/srv-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'srv-1');
    });
  });

  describe('POST /services', () => {
    it('returns 422 when required fields are missing', async () => {
      const res = await request(app)
        .post('/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'invalid-service',
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('returns 202 with created service and triggers provisioning', async () => {
      vi.spyOn(servicesService, 'createService').mockResolvedValueOnce({
        id: 'srv-new',
        name: 'user-auth-service',
        templateId: '33333333-3333-3333-3333-333333333333',
        teamId: '22222222-2222-2222-2222-222222222222',
        ownerId: '11111111-1111-1111-1111-111111111111',
        status: 'pending',
        region: 'us-east-1',
        repositoryUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const res = await request(app)
        .post('/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'user-auth-service',
          templateId: '33333333-3333-3333-3333-333333333333',
          teamId: '22222222-2222-2222-2222-222222222222',
          region: 'us-east-1',
          config: {
            nodeVersion: '20',
            port: 3000,
          },
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('id', 'srv-new');
      expect(res.body).toHaveProperty('status', 'pending');
    });
  });
});
