import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';

interface UserRow {
  id: string;
  email: string;
  role: string;
  team_id: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * Get user profile by ID.
 */
export async function getUserById(userId: string) {
  const result = await query<UserRow>(
    `SELECT id, email, role, team_id, created_at, updated_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

/**
 * Update user profile (email only for now).
 */
export async function updateUser(userId: string, data: { email?: string }) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (data.email) {
    fields.push(`email = $${paramIdx++}`);
    values.push(data.email);
  }

  if (fields.length === 0) {
    throw new AppError(422, 'NO_FIELDS', 'No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query<UserRow>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx}
     RETURNING id, email, role, team_id, created_at, updated_at, last_login_at`,
    values,
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}
