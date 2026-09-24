import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDeployment,
  getDeploymentsByServiceId,
  getDeploymentById,
  updateDeployment,
} from '../../src/modules/deployments/deployments.service.js';
import { query } from '../../src/database/index.js';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn(),
}));

describe('Deployments Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDeployment()', () => {
    it('should create a deployment record for valid service', async () => {
      const mockQuery = vi.mocked(query);

      // 1. getServiceById check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-1', name: 'service-a' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 2. insert deployment
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'dep-1',
          service_id: 'srv-1',
          triggered_by: 'user-1',
          github_run_id: 'gh-123',
          status: 'running',
          commit_sha: 'a1b2c3d',
          branch: 'main',
          started_at: new Date(),
          completed_at: null,
          created_at: new Date(),
        }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await createDeployment(
        { serviceId: 'srv-1', commitSha: 'a1b2c3d', branch: 'main', githubRunId: 'gh-123' },
        'user-1',
        'team-1',
        'developer',
      );

      expect(result.id).toBe('dep-1');
      expect(result.status).toBe('running');
      expect(result.commitSha).toBe('a1b2c3d');
    });
  });

  describe('getDeploymentsByServiceId()', () => {
    it('should return list of deployments for service', async () => {
      const mockQuery = vi.mocked(query);

      // getServiceById check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-1' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // select deployments
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'dep-1',
            service_id: 'srv-1',
            triggered_by: 'user-1',
            github_run_id: 'gh-100',
            status: 'succeeded',
            commit_sha: 'sha-1',
            branch: 'main',
            started_at: new Date(),
            completed_at: new Date(),
            created_at: new Date(),
          },
        ],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const list = await getDeploymentsByServiceId('srv-1', 'team-1', 'developer');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('dep-1');
      expect(list[0].status).toBe('succeeded');
    });
  });

  describe('updateDeployment()', () => {
    it('should update status and return updated deployment', async () => {
      const mockQuery = vi.mocked(query);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'dep-1',
          service_id: 'srv-1',
          triggered_by: 'user-1',
          github_run_id: 'gh-100',
          status: 'succeeded',
          commit_sha: 'sha-1',
          branch: 'main',
          started_at: new Date(),
          completed_at: new Date(),
          created_at: new Date(),
        }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const updated = await updateDeployment('dep-1', { status: 'succeeded' });
      expect(updated.status).toBe('succeeded');
    });
  });
});
