import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

export interface AuthPayload {
  userId: string;
  email: string;
  tokenUse: 'access';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.publicKey, {
      algorithms: ['RS256'],
    }) as AuthPayload;
    if (payload.tokenUse !== 'access') {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid access token');
    }
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
