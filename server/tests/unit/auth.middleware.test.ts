import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../src/middleware/auth.js';
import { config } from '../../src/config/index.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('Auth Middleware - Unit Tests', () => {
  describe('authenticate()', () => {
    it('should throw AppError 401 if Authorization header is missing', () => {
      const req = { headers: {} } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => authenticate(req, res, next)).toThrow(AppError);
      expect(() => authenticate(req, res, next)).toThrowError(
        expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw AppError 401 if Authorization header does not start with Bearer', () => {
      const req = { headers: { authorization: 'Basic token123' } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => authenticate(req, res, next)).toThrow(AppError);
    });

    it('should throw AppError 401 if token is invalid or expired', () => {
      const req = { headers: { authorization: 'Bearer invalid.jwt.token' } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => authenticate(req, res, next)).toThrow(AppError);
    });

    it('should populate req.user and call next() when token is valid', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'user@scape.io',
        role: 'developer' as const,
        teamId: 'team-1',
      };
      const token = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toMatchObject({
        userId: 'test-user-id',
        email: 'user@scape.io',
        role: 'developer',
      });
    });
  });

  describe('authorize()', () => {
    it('should throw AppError 401 if req.user is undefined', () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = authorize('admin', 'devops');
      expect(() => middleware(req, res, next)).toThrow(AppError);
      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it('should throw AppError 403 if user role is not permitted', () => {
      const req = {
        user: { userId: '1', email: 'dev@scape.io', role: 'developer', teamId: 't1' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = authorize('admin', 'devops');
      expect(() => middleware(req, res, next)).toThrow(AppError);
      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
      );
    });

    it('should call next() if user role is permitted', () => {
      const req = {
        user: { userId: '1', email: 'lead@scape.io', role: 'team_lead', teamId: 't1' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = authorize('developer', 'team_lead');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
