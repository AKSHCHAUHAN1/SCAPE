import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middleware/validate.js';

describe('Validate Middleware - Unit Tests', () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  it('should call next() without error when request body is valid', () => {
    const middleware = validate(schema, 'body');
    const req = {
      body: { email: 'dev@scape.io', age: 25 },
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: 'dev@scape.io', age: 25 });
  });

  it('should return 422 with VALIDATION_ERROR details when body fails validation', () => {
    const middleware = validate(schema, 'body');
    const req = {
      body: { email: 'invalid-email', age: 16 },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'age' }),
          ]),
        }),
      }),
    );
  });

  it('should validate query parameters when source is "query"', () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1),
    });

    const middleware = validate(querySchema, 'query');
    const req = {
      query: { page: '2' },
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).query.page).toBe(2);
  });
});
