import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query } from '../../database/index.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  team_id: string | null;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  teamId: string;
}

/**
 * Register a new user.
 */
export async function register(input: RegisterInput) {
  // Check if email already exists
  const existing = await query<UserRow>(
    'SELECT id FROM users WHERE email = $1',
    [input.email],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  // Validate team exists if provided
  if (input.teamId) {
    const team = await query('SELECT id FROM teams WHERE id = $1', [input.teamId]);
    if (!team.rowCount || team.rowCount === 0) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Insert user
  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, role, team_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, team_id`,
    [input.email, passwordHash, input.role || 'developer', input.teamId || null],
  );

  const user = result.rows[0];

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id || '',
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      teamId: user.team_id,
    },
  };
}

/**
 * Login with email and password.
 */
export async function login(input: LoginInput) {
  // Find user
  const result = await query<UserRow>(
    'SELECT id, email, password_hash, role, team_id FROM users WHERE email = $1',
    [input.email],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Update last_login_at
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id || '',
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      teamId: user.team_id,
    },
  };
}

/**
 * Refresh access token using a valid refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

    // Verify user still exists
    const result = await query<UserRow>(
      'SELECT id, email, role, team_id FROM users WHERE id = $1',
      [payload.userId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    const user = result.rows[0];

    // Issue new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        teamId: user.team_id || '',
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry } as SignOptions,
    );

    return { accessToken };
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
}

/**
 * Generate access + refresh token pair.
 */
function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  } as SignOptions);

  return { accessToken, refreshToken };
}
