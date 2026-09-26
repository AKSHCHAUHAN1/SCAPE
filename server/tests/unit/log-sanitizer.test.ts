/**
 * Log Sanitizer — Unit Tests
 * Sprint 7: Verify credential stripping from Terraform logs
 */
import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeTerraformLogs, sanitizeEnvForLogging } from '../../src/modules/provisioning/log-sanitizer.js';

describe('Log Sanitizer', () => {
  describe('sanitize', () => {
    it('should redact AWS Access Key IDs', () => {
      const input = 'Using credentials AKIAIOSFODNN7EXAMPLE for region us-east-1';
      const result = sanitize(input);
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result).toContain('[REDACTED_AWS_ACCESS_KEY]');
    });

    it('should redact AWS Session Token access keys (ASIA prefix)', () => {
      const input = 'Temporary key: ASIAIOSFODNN7EXAMPLE';
      const result = sanitize(input);
      expect(result).not.toContain('ASIAIOSFODNN7EXAMPLE');
      expect(result).toContain('[REDACTED_AWS_ACCESS_KEY]');
    });

    it('should redact AWS_SECRET_ACCESS_KEY values', () => {
      const input = 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const result = sanitize(input);
      expect(result).not.toContain('wJalrXUtnFEMI');
      expect(result).toContain('[REDACTED_AWS_SECRET_KEY]');
    });

    it('should redact AWS_SESSION_TOKEN values', () => {
      const longToken = 'A'.repeat(150);
      const input = `AWS_SESSION_TOKEN=${longToken}`;
      const result = sanitize(input);
      expect(result).not.toContain(longToken);
      expect(result).toContain('[REDACTED_AWS_SESSION_TOKEN]');
    });

    it('should redact generic password fields', () => {
      const input = 'password=SuperSecretPassword123!';
      const result = sanitize(input);
      expect(result).not.toContain('SuperSecretPassword123!');
      expect(result).toContain('[REDACTED_SECRET]');
    });

    it('should redact database connection strings', () => {
      const input = 'DATABASE_URL=postgres://user:mypassword@host:5432/db';
      const result = sanitize(input);
      expect(result).not.toContain('mypassword');
    });

    it('should redact GitHub PATs', () => {
      const input = 'Using token ghp_1234567890abcdefghijklmnop';
      const result = sanitize(input);
      expect(result).not.toContain('ghp_1234567890abcdefghijklmnop');
      expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
    });

    it('should redact GitHub fine-grained PATs', () => {
      const input = 'Auth: github_pat_11ABCDEF01234567890_abcdefghijklmnopqrstuvwxyz';
      const result = sanitize(input);
      expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
    });

    it('should not modify clean strings', () => {
      const input = 'Terraform apply completed. Created 5 resources.';
      expect(sanitize(input)).toBe(input);
    });

    it('should handle empty strings', () => {
      expect(sanitize('')).toBe('');
    });

    it('should handle multiple sensitive values in one string', () => {
      const input = 'Key: AKIAIOSFODNN7EXAMPLE, password=secret123456';
      const result = sanitize(input);
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result).not.toContain('secret123456');
    });
  });

  describe('sanitizeTerraformLogs', () => {
    it('should sanitize and return logs within max length', () => {
      const input = 'Using AKIAIOSFODNN7EXAMPLE for provisioning';
      const result = sanitizeTerraformLogs(input);
      expect(result).toContain('[REDACTED_AWS_ACCESS_KEY]');
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should truncate logs exceeding max length', () => {
      const longLog = 'x'.repeat(2_000_000);
      const result = sanitizeTerraformLogs(longLog, 1_000_000);
      expect(result.length).toBeLessThanOrEqual(1_000_100); // Allow for truncation message
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle empty input', () => {
      expect(sanitizeTerraformLogs('')).toBe('');
    });
  });

  describe('sanitizeEnvForLogging', () => {
    it('should redact sensitive environment variable values', () => {
      const env = {
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'secret123',
        AWS_SESSION_TOKEN: 'token123',
        NODE_ENV: 'production',
        PORT: '3000',
      };

      const result = sanitizeEnvForLogging(env);
      expect(result.AWS_ACCESS_KEY_ID).toBe('[REDACTED]');
      expect(result.AWS_SECRET_ACCESS_KEY).toBe('[REDACTED]');
      expect(result.AWS_SESSION_TOKEN).toBe('[REDACTED]');
      expect(result.NODE_ENV).toBe('production');
      expect(result.PORT).toBe('3000');
    });

    it('should redact keys matching secret/password/token patterns', () => {
      const env = {
        MY_SECRET_VALUE: 'hidden',
        DB_PASSWORD: 'hidden',
        API_TOKEN: 'hidden',
        SAFE_VALUE: 'visible',
      };

      const result = sanitizeEnvForLogging(env);
      expect(result.MY_SECRET_VALUE).toBe('[REDACTED]');
      expect(result.DB_PASSWORD).toBe('[REDACTED]');
      expect(result.API_TOKEN).toBe('[REDACTED]');
      expect(result.SAFE_VALUE).toBe('visible');
    });
  });
});
