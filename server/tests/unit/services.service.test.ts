import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createService, getServiceById, getServiceHealth } from '../../src/modules/services/services.service.js';
import { query } from '../../src/database/index.js';
import { provisioningQueue } from '../../src/queue/index.js';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/queue/index.js', () => ({
  provisioningQueue: {
    add: vi.fn(),
  },
}));

vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn(),
}));

describe('Services Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createService()', () => {
    it('should create a service, provisioning job, and enqueue it', async () => {
      const mockQuery = vi.mocked(query);
      const mockAdd = vi.mocked(provisioningQueue.add);

      // 1. Verify template exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'tpl-1', terraform_module_path: 'path/to/tf' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 2. Check duplicate name -> none
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      // 3. Insert service
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', name: 'my-service', status: 'pending', region: 'us-east-1', team_id: 'team-1', template_id: 'tpl-1' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 4. Insert provisioning job
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'job-1', status: 'queued', created_at: new Date() }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await createService(
        { name: 'my-service', templateId: 'tpl-1', region: 'us-east-1' },
        'user-1',
        'team-1'
      );

      expect(result.service.id).toBe('srv-1');
      expect(result.job.id).toBe('job-1');
      expect(mockAdd).toHaveBeenCalledWith('provision', expect.objectContaining({
        jobId: 'job-1',
        serviceId: 'srv-1',
        terraformModulePath: 'path/to/tf',
      }), { jobId: 'job-1' });
    });

    it('should throw if template does not exist', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      await expect(
        createService({ name: 'test', templateId: 'invalid', region: 'us-east-1' }, 'u1', 't1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getServiceById()', () => {
    it('should return service if user is in the same team', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-1' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await getServiceById('srv-1', 'team-1', 'developer');
      expect(result.id).toBe('srv-1');
    });

    it('should return service for admin even if team differs', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-2' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await getServiceById('srv-1', 'team-1', 'admin');
      expect(result.id).toBe('srv-1');
    });

    it('should throw 403 if user is not in the same team and not admin', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-2' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      await expect(getServiceById('srv-1', 'team-1', 'developer')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('getServiceHealth()', () => {
    it('checks the provisioned Node API health endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      vi.stubGlobal('fetch', mockFetch);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'srv-1', team_id: 'team-1', status: 'active', service_endpoint: 'http://scape-123.ap-south-1.elb.amazonaws.com',
          template_name: 'Node.js API',
        }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await getServiceHealth('srv-1', 'team-1', 'developer');

      expect(result.status).toBe('healthy');
      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(String(url)).toBe('http://scape-123.ap-south-1.elb.amazonaws.com/health');
      expect(options).toMatchObject({ method: 'GET', redirect: 'manual' });
    });

    it('returns unknown before provisioning completes', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-1', status: 'provisioning', service_endpoint: null }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await getServiceHealth('srv-1', 'team-1', 'developer');

      expect(result.status).toBe('unknown');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
