/**
 * Log Sanitizer
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * Strips sensitive data (AWS credentials, secrets, tokens) from
 * Terraform CLI output before persisting to the database.
 *
 * Security requirement: No credential leakage in logs.
 */

import { logger } from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Sensitive patterns to redact
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // AWS Access Key ID (starts with AKIA, ASIA, or AIDA)
  {
    pattern: /(?:AKIA|ASIA|AIDA)[0-9A-Z]{16}/g,
    replacement: '[REDACTED_AWS_ACCESS_KEY]',
  },
  // AWS Secret Access Key (40 character base64-ish string after a key indicator)
  {
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|SecretAccessKey)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
    replacement: '[REDACTED_AWS_SECRET_KEY]',
  },
  // AWS Session Token (long base64 string)
  {
    pattern: /(?:aws_session_token|AWS_SESSION_TOKEN|SessionToken)\s*[=:]\s*["']?[A-Za-z0-9/+=]{100,}["']?/gi,
    replacement: '[REDACTED_AWS_SESSION_TOKEN]',
  },
  // Generic secret/password/token key-value pairs
  {
    pattern: /(?:password|secret|token|api_key|apikey|private_key)\s*[=:]\s*["']?[^\s"',}{)]{8,}["']?/gi,
    replacement: '[REDACTED_SECRET]',
  },
  // Database connection strings with embedded passwords
  {
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi,
    replacement: '[REDACTED_DB_URI]://',
  },
  // GitHub tokens
  {
    pattern: /(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  // JWT tokens (three base64 segments)
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacement: '[REDACTED_JWT]',
  },
  // ARN with account ID — keep the ARN structure but redact account
  // We keep ARNs as they are useful for debugging, but redact if paired with secrets
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitize a single string by replacing all sensitive patterns.
 */
export function sanitize(input: string): string {
  if (!input) return input;

  let sanitized = input;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Sanitize Terraform log output (may be multi-line).
 * Also truncates to maxLength to prevent oversized DB writes.
 */
export function sanitizeTerraformLogs(
  logs: string,
  maxLength: number = 1_000_000, // 1 MB max
): string {
  if (!logs) return logs;

  let result = sanitize(logs);

  if (result.length > maxLength) {
    logger.warn(
      { originalLength: result.length, maxLength },
      'Terraform logs truncated to fit storage limit',
    );
    result = result.slice(0, maxLength) + '\n\n[TRUNCATED — log exceeded maximum storage size]';
  }

  return result;
}

/**
 * Sanitize environment variables dict — returns a copy with
 * sensitive values replaced. Useful for debug logging.
 */
export function sanitizeEnvForLogging(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const SENSITIVE_KEYS = new Set([
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'DATABASE_URL',
    'GITHUB_TOKEN',
    'GITHUB_APP_TOKEN',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ]);

  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (SENSITIVE_KEYS.has(key) || /secret|password|token|key/i.test(key)) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value ?? '';
    }
  }

  return safe;
}
