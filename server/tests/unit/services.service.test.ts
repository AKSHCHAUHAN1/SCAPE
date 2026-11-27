import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createService,
  getAllServices,
  getServiceById,
  getServiceHealth,
  validateGitHubRepository,
} from '../../src/modules/services/services.service.js';
import { query } from '../../src/database/index.js';
import { provisioningQueue } from '../../src/queue/index.js';

const { mockGetRepositoryMetadata, mockEstimateServiceCost } = vi.hoisted(() => ({
  mockGetRepositoryMetadata: vi.fn(),
  mockEstimateServiceCost: vi.fn(),
}));

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/modules/cicd/github-client.js', () => ({
  GitHubIntegrator: vi.fn().mockImplementation(() => ({
    getRepositoryMetadata: mockGetRepositoryMetadata,
  })),
}));

vi.mock('../../src/modules/cost/cost-estimator.js', () => ({
  estimateServiceCost: mockEstimateServiceCost,
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
    mockEstimateServiceCost.mockReset();
    mockGetRepositoryMetadata.mockResolvedValue({
      htmlUrl: 'https://github.com/acme/my-service',
      fullName: 'acme/my-service',
      ownerId: 1,
      repositoryId: 2,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists only services owned by the authenticated account', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [], rowCount: 0, command: '', oid: 0, fields: [],
    });

    await expect(getAllServices('user-1')).resolves.toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.owner_id = $1'), ['user-1']);
  });

  describe('validateGitHubRepository()', () => {
    it('validates a repository URL against the configured GitHub App', async () => {
      await expect(validateGitHubRepository('https://github.com/acme/my-service')).resolves.toEqual({
        htmlUrl: 'https://github.com/acme/my-service',
        fullName: 'acme/my-service',
      });
      expect(mockGetRepositoryMetadata).toHaveBeenCalledWith('https://github.com/acme/my-service');
    });

    it('accepts a repository accessible to the GitHub App without requiring an admin role flag', async () => {
      mockGetRepositoryMetadata.mockResolvedValueOnce({
        htmlUrl: 'https://github.com/acme/my-service',
        fullName: 'acme/my-service',
        ownerId: 1,
        repositoryId: 2,
      });

      await expect(validateGitHubRepository('https://github.com/acme/my-service')).resolves.toEqual({
        htmlUrl: 'https://github.com/acme/my-service',
        fullName: 'acme/my-service',
      });
    });

    it('explains when the SCAPE GitHub App cannot access the repository', async () => {
      mockGetRepositoryMetadata.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));

      await expect(validateGitHubRepository('https://github.com/acme/private-service')).rejects.toMatchObject({
        statusCode: 422,
        code: 'GITHUB_REPOSITORY_UNAVAILABLE',
      });
    });
  });

  describe('createService()', () => {
    it('should create a service, provisioning job, and enqueue it', async () => {
      const mockQuery = vi.mocked(query);
      const mockAdd = vi.mocked(provisioningQueue.add);
      mockEstimateServiceCost.mockRejectedValueOnce(new Error('AWS Pricing API unavailable'));

      // 1. Verify template exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'tpl-1', terraform_module_path: 'path/to/tf', template_type: 'nodejs-api' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 2. Check duplicate name -> none
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      // 3. Insert service
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'srv-1', name: 'my-service', owner_id: 'user-1', status: 'pending',
          region: 'us-east-1', team_id: null, template_id: 'tpl-1',
        }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 4. Insert provisioning job
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'job-1', status: 'queued', created_at: new Date() }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await createService(
        {
          name: 'my-service',
          templateId: 'tpl-1',
          region: 'us-east-1',
          repositoryUrl: 'https://github.com/acme/my-service',
          expectedDurationHours: 24,
        },
        'user-1',
      );

      expect(result.service.id).toBe('srv-1');
      expect(result.job.id).toBe('job-1');
      expect(mockAdd).toHaveBeenCalledWith('provision', expect.objectContaining({
        jobId: 'job-1',
        serviceId: 'srv-1',
        terraformModulePath: 'path/to/tf',
        repositoryUrl: 'https://github.com/acme/my-service',
      }), { jobId: 'job-1' });
      expect(mockEstimateServiceCost).not.toHaveBeenCalled();
      const serviceInsertValues = mockQuery.mock.calls[2][1] as unknown[];
      expect(serviceInsertValues).toContain('user-1');
      expect(mockQuery.mock.calls[2][0]).toContain('VALUES ($1, $2, NULL');
      expect(serviceInsertValues.slice(10)).toEqual([
        'https://github.com/acme/my-service',
        24,
      ]);
    });

    it('should throw if template does not exist', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      await expect(
        createService({
          name: 'test',
          templateId: 'invalid',
          region: 'us-east-1',
          repositoryUrl: 'https://github.com/acme/my-service',
          expectedDurationHours: 24,
        }, 'u1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getServiceById()', () => {
    it('returns a service owned by the requesting account', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', owner_id: 'user-1' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const result = await getServiceById('srv-1', 'user-1');
      expect(result.id).toBe('srv-1');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('s.owner_id = $2'), ['srv-1', 'user-1']);
    });

    it('does not return another account’s service', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0, command: '', oid: 0, fields: []
      });

      await expect(getServiceById('srv-1', 'user-2')).rejects.toMatchObject({
        statusCode: 404,
        code: 'SERVICE_NOT_FOUND',
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
          id: 'srv-1', owner_id: 'user-1', status: 'active', service_endpoint: 'http://scape-123.ap-south-1.elb.amazonaws.com',
          template_name: 'Node.js API',
        }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await getServiceHealth('srv-1', 'user-1');

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
        rows: [{ id: 'srv-1', owner_id: 'user-1', status: 'provisioning', service_endpoint: null }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await getServiceHealth('srv-1', 'user-1');

      expect(result.status).toBe('unknown');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
