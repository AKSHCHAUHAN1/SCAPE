import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CreateTeamInput } from './teams.schema.js';

interface TeamRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  team_id: string | null;
  created_at: Date;
}

/**
 * Get all teams.
 */
export async function getAllTeams() {
  const result = await query<TeamRow>(
    'SELECT id, name, created_at, updated_at FROM teams ORDER BY name',
  );

  return result.rows.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

/**
 * Create a new team.
 */
export async function createTeam(input: CreateTeamInput) {
  // Check for duplicate name
  const existing = await query<TeamRow>(
    'SELECT id FROM teams WHERE name = $1',
    [input.name],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'TEAM_EXISTS', 'A team with this name already exists');
  }

  const result = await query<TeamRow>(
    `INSERT INTO teams (name) VALUES ($1)
     RETURNING id, name, created_at, updated_at`,
    [input.name],
  );

  const team = result.rows[0];
  return {
    id: team.id,
    name: team.name,
    createdAt: team.created_at,
    updatedAt: team.updated_at,
  };
}

/**
 * Get a team by ID.
 */
export async function getTeamById(teamId: string) {
  const result = await query<TeamRow>(
    'SELECT id, name, created_at, updated_at FROM teams WHERE id = $1',
    [teamId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  const team = result.rows[0];
  return {
    id: team.id,
    name: team.name,
    createdAt: team.created_at,
    updatedAt: team.updated_at,
  };
}

/**
 * Get all members of a team.
 */
export async function getTeamMembers(teamId: string) {
  // Verify team exists
  const team = await query('SELECT id FROM teams WHERE id = $1', [teamId]);
  if (!team.rowCount || team.rowCount === 0) {
    throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  const result = await query<UserRow>(
    `SELECT id, email, role, team_id, created_at
     FROM users WHERE team_id = $1
     ORDER BY email`,
    [teamId],
  );

  return result.rows.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    teamId: u.team_id,
    createdAt: u.created_at,
  }));
}

/**
 * Add a user to a team.
 */
export async function addTeamMember(teamId: string, userId: string) {
  // Verify team exists
  const team = await query('SELECT id FROM teams WHERE id = $1', [teamId]);
  if (!team.rowCount || team.rowCount === 0) {
    throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  // Verify user exists
  const user = await query<UserRow>(
    'SELECT id, email, role, team_id, created_at FROM users WHERE id = $1',
    [userId],
  );
  if (!user.rowCount || user.rowCount === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  // Check if user is already in this team
  if (user.rows[0].team_id === teamId) {
    throw new AppError(409, 'ALREADY_MEMBER', 'User is already a member of this team');
  }

  // Assign user to team
  const result = await query<UserRow>(
    `UPDATE users SET team_id = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, email, role, team_id, created_at`,
    [teamId, userId],
  );

  const updated = result.rows[0];
  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    teamId: updated.team_id,
    createdAt: updated.created_at,
  };
}
