import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTeam, getTeamById, getAllTeams } from '../../src/modules/teams/teams.service.js';
import { query } from '../../src/database/index.js';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

describe('Teams Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTeam()', () => {
    it('should create a new team successfully', async () => {
      const mockQuery = vi.mocked(query);

      // 1. Duplicate check -> none found
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      // 2. Insert team
      const mockTeam = { id: 'team-1', name: 'Alpha', created_at: new Date(), updated_at: new Date() };
      mockQuery.mockResolvedValueOnce({ rows: [mockTeam], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await createTeam({ name: 'Alpha' });
      expect(result).toHaveProperty('id', 'team-1');
      expect(result).toHaveProperty('name', 'Alpha');
    });

    it('should throw if team name already exists', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'team-1' }], rowCount: 1, command: '', oid: 0, fields: [] });

      await expect(createTeam({ name: 'Alpha' })).rejects.toMatchObject({
        statusCode: 409,
        code: 'TEAM_EXISTS',
      });
    });
  });

  describe('getTeamById()', () => {
    it('should return team if found', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'team-1', name: 'Alpha', created_at: new Date(), updated_at: new Date() }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await getTeamById('team-1');
      expect(result.id).toBe('team-1');
      expect(result.name).toBe('Alpha');
    });

    it('should throw 404 if not found', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      await expect(getTeamById('not-found')).rejects.toMatchObject({
        statusCode: 404,
        code: 'TEAM_NOT_FOUND',
      });
    });
  });

  describe('getAllTeams()', () => {
    it('should return all teams', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 't1', name: 'T1', created_at: new Date(), updated_at: new Date() },
          { id: 't2', name: 'T2', created_at: new Date(), updated_at: new Date() }
        ],
        rowCount: 2, command: '', oid: 0, fields: []
      });

      const result = await getAllTeams();
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('T1');
      expect(result[1].name).toBe('T2');
    });
  });
});
