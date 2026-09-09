import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { RegisterInput, LoginInput } from './auth.schema.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input: RegisterInput = req.body;
    const result = await authService.register(input);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input: LoginInput = req.body;
    const result = await authService.login(input);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No refresh token provided',
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    authService.revokeRefreshToken(refreshToken);
  }

  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.status(200).json({ message: 'Logged out successfully' });
}
