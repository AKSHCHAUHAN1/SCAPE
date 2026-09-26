/**
 * State Manager — Unit Tests
 * Sprint 7: Verify state backend config generation
 */
import { describe, it, expect } from 'vitest';
import {
  getStateKey,
  getStateBackendConfig,
  getBackendConfigArgs,
  getWorkspaceName,
  getStateFileUri,
} from '../../src/modules/provisioning/state-manager.js';

describe('State Manager', () => {
  const testServiceId = 'abc-123-def-456';

  describe('getStateKey', () => {
    it('should generate correct S3 key pattern', () => {
      const key = getStateKey(testServiceId);
      expect(key).toBe(`services/${testServiceId}/terraform.tfstate`);
    });

    it('should handle UUID-format service IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const key = getStateKey(uuid);
      expect(key).toBe(`services/${uuid}/terraform.tfstate`);
    });
  });

  describe('getStateBackendConfig', () => {
    it('should return a complete backend config', () => {
      const cfg = getStateBackendConfig(testServiceId);
      expect(cfg).toHaveProperty('bucket');
      expect(cfg).toHaveProperty('key');
      expect(cfg).toHaveProperty('region');
      expect(cfg).toHaveProperty('dynamodbTable');
      expect(cfg).toHaveProperty('encrypt', true);
    });

    it('should use the service ID in the state key', () => {
      const cfg = getStateBackendConfig(testServiceId);
      expect(cfg.key).toContain(testServiceId);
    });

    it('should have encryption enabled', () => {
      const cfg = getStateBackendConfig(testServiceId);
      expect(cfg.encrypt).toBe(true);
    });
  });

  describe('getBackendConfigArgs', () => {
    it('should return CLI-formatted backend config args', () => {
      const args = getBackendConfigArgs(testServiceId);

      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBe(5);

      // Check each arg starts with -backend-config=
      for (const arg of args) {
        expect(arg).toMatch(/^-backend-config=/);
      }

      // Check specific values
      expect(args.find(a => a.includes('bucket='))).toBeTruthy();
      expect(args.find(a => a.includes(`key=services/${testServiceId}/`))).toBeTruthy();
      expect(args.find(a => a.includes('dynamodb_table='))).toBeTruthy();
      expect(args.find(a => a.includes('encrypt=true'))).toBeTruthy();
    });
  });

  describe('getWorkspaceName', () => {
    it('should return the service ID as workspace name', () => {
      expect(getWorkspaceName(testServiceId)).toBe(testServiceId);
    });
  });

  describe('getStateFileUri', () => {
    it('should return a valid S3 URI', () => {
      const uri = getStateFileUri(testServiceId);
      expect(uri).toMatch(/^s3:\/\//);
      expect(uri).toContain(testServiceId);
    });
  });
});
