/**
 * GitHub App Authentication
 * Spec: 08-CICD-Integration
 *
 * Implements GitHub App authentication flow:
 * 1. Generate JWT from App private key
 * 2. Exchange JWT for an installation access token
 * 3. Cache tokens until expiry (tokens last ~1 hour)
 *
 * ADR-019: GitHub App over PAT for per-repo fine-grained permissions
 *
 * When no App credentials are configured (local dev), falls back
 * to GITHUB_TOKEN environment variable (PAT mode).
 */

import { Octokit } from '@octokit/rest';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import type { GitHubAppToken } from './types.js';

// ---------------------------------------------------------------------------
// Token Cache
// ---------------------------------------------------------------------------

let cachedToken: GitHubAppToken | null = null;

/**
 * Clear the cached token (useful for testing or forced refresh).
 */
export function clearTokenCache(): void {
  cachedToken = null;
}

// ---------------------------------------------------------------------------
// JWT Generation
// ---------------------------------------------------------------------------

/**
 * Generate a JWT for GitHub App authentication.
 * The JWT is signed with the App's private key and has a 10-minute TTL.
 */
function generateAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iat: now - 60, // Issued 60 seconds in the past to allow clock drift
    exp: now + 10 * 60, // 10 minute expiry
    iss: appId,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signature}`;
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Installation Token
// ---------------------------------------------------------------------------

/**
 * Get a GitHub App installation access token.
 * Returns a cached token if still valid (with 5-minute buffer).
 *
 * If App credentials are not configured, falls back to GITHUB_TOKEN.
 */
export async function getInstallationToken(): Promise<string | null> {
  // Fall back to PAT if App is not configured
  if (!config.github.appId || !config.github.privateKeyPath) {
    const pat = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;
    if (pat) {
      logger.debug('Using PAT fallback for GitHub authentication');
      return pat;
    }
    logger.debug('No GitHub authentication configured');
    return null;
  }

  // Check cached token (with 5-minute buffer before expiry)
  if (cachedToken) {
    const bufferMs = 5 * 60 * 1000;
    if (cachedToken.expiresAt.getTime() - bufferMs > Date.now()) {
      return cachedToken.token;
    }
    logger.debug('Cached GitHub App token expired, refreshing');
  }

  try {
    // Read private key
    const privateKey = await fs.readFile(config.github.privateKeyPath, 'utf-8');

    // Generate App JWT
    const jwt = generateAppJwt(config.github.appId, privateKey);

    // Create Octokit with JWT to list installations
    const jwtOctokit = new Octokit({ auth: jwt });

    // Get installations for this App
    const { data: installations } = await jwtOctokit.apps.listInstallations();

    if (installations.length === 0) {
      logger.warn('No GitHub App installations found');
      return null;
    }

    // Use the first installation (in a multi-org setup, you'd filter by org)
    const installationId = installations[0].id;

    // Create installation access token
    const { data: tokenData } = await jwtOctokit.apps.createInstallationAccessToken({
      installation_id: installationId,
    });

    // Cache the token
    cachedToken = {
      token: tokenData.token,
      expiresAt: new Date(tokenData.expires_at),
      installationId,
    };

    logger.info(
      { installationId, expiresAt: tokenData.expires_at },
      'GitHub App installation token acquired',
    );

    return cachedToken.token;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to acquire GitHub App installation token');
    return null;
  }
}

/**
 * Create an Octokit instance authenticated with the App installation token.
 * Returns null if authentication is not configured.
 */
export async function createAuthenticatedOctokit(): Promise<Octokit | null> {
  const token = await getInstallationToken();
  if (!token) return null;

  return new Octokit({ auth: token });
}
