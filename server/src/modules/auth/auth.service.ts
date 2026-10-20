import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query } from '../../database/index.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  email: string;
  password_hash?: string;
  role: string;
  team_id: string | null;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  teamId: string;
}

interface RefreshPayload extends TokenPayload {
  tokenUse: 'refresh';
  jti: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function issueTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(
    { ...payload, tokenUse: 'access' },
    config.jwt.privateKey,
    { algorithm: 'RS256', expiresIn: config.jwt.accessExpiry as SignOptions['expiresIn'] },
  );
  const jti = randomUUID();
  const refreshToken = jwt.sign(
    { ...payload, tokenUse: 'refresh', jti },
    config.jwt.privateKey,
    { algorithm: 'RS256', expiresIn: config.jwt.refreshExpiry as SignOptions['expiresIn'] },
  );
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;

  if (!decoded?.exp) {
    throw new Error('Could not determine refresh token expiry.');
  }

  await query(
    `INSERT INTO refresh_sessions (jti, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, to_timestamp($4))`,
    [jti, payload.userId, hashToken(refreshToken), decoded.exp],
  );

  return { accessToken, refreshToken };
}

function toUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id,
  };
}

/** Register an unprivileged developer account; team assignment is an admin action. */
export async function register(input: RegisterInput) {
  const existing = await query<UserRow>(
    'SELECT id FROM users WHERE email = $1',
    [input.email],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, role, team_id)
     VALUES ($1, $2, 'developer', NULL)
     RETURNING id, email, role, team_id`,
    [input.email, passwordHash],
  );
  const user = result.rows[0];
  const tokens = await issueTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id || '',
  });

  return { ...tokens, user: toUser(user) };
}

/** Login with email and password. */
export async function login(input: LoginInput) {
  const result = await query<UserRow>(
    'SELECT id, email, password_hash, role, team_id FROM users WHERE email = $1',
    [input.email],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(input.password, user.password_hash || '');
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  const tokens = await issueTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id || '',
  });

  return { ...tokens, user: toUser(user) };
}

/** Rotate a single-use refresh token and return the replacement cookie token. */
export async function refreshAccessToken(refreshToken: string) {
  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.publicKey, {
      algorithms: ['RS256'],
    }) as RefreshPayload;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  if (payload.tokenUse !== 'refresh' || !payload.jti || !payload.userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const userResult = await query<UserRow>(
    'SELECT id, email, role, team_id FROM users WHERE id = $1',
    [payload.userId],
  );
  if (!userResult.rowCount || userResult.rowCount === 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not found');
  }

  const revoked = await query(
    `UPDATE refresh_sessions
     SET revoked_at = NOW()
     WHERE jti = $1 AND user_id = $2 AND token_hash = $3
       AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING jti`,
    [payload.jti, payload.userId, hashToken(refreshToken)],
  );
  if (!revoked.rowCount) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token has already been used or revoked');
  }

  const user = userResult.rows[0];
  return issueTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id || '',
  });
}

/** Revoke the presented refresh token in the shared database session store. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await query(
    `UPDATE refresh_sessions SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(refreshToken)],
  );
}
