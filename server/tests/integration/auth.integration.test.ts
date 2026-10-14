import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as authService from '../../src/modules/auth/auth.service.js';

describe('Auth Endpoints - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('returns 201 with accessToken and sets refreshToken cookie on successful registration', async () => {
      vi.spyOn(authService, 'register').mockResolvedValueOnce({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'newdeveloper@scape.dev',
          role: 'developer',
          teamId: '22222222-2222-2222-2222-222222222222',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null,
        },
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'newdeveloper@scape.dev',
          password: 'Password123!',
          role: 'developer',
          teamId: '22222222-2222-2222-2222-222222222222',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken', 'mock-access-token');
      expect(res.body.user).toHaveProperty('email', 'newdeveloper@scape.dev');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken=mock-refresh-token');
    });

    it('returns 422 validation error when email is invalid', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with tokens and user object on valid credentials', async () => {
      vi.spyOn(authService, 'login').mockResolvedValueOnce({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'dev@scape.dev',
          role: 'developer',
          teamId: '22222222-2222-2222-2222-222222222222',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      });

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'dev@scape.dev',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken', 'jwt-access-token');
      expect(res.body.user).toHaveProperty('email', 'dev@scape.dev');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken=jwt-refresh-token');
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 when no refreshToken cookie is provided', async () => {
      const res = await request(app).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('returns 200 and rotates access token when valid refreshToken cookie is sent', async () => {
      vi.spyOn(authService, 'refreshAccessToken').mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=valid-existing-token']);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken', 'new-access-token');
    });
  });
});
