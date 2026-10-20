import { generateKeyPairSync } from 'node:crypto';

/**
 * Centralised application configuration.
 * Reads from environment variables with sensible defaults.
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const configuredPrivateKey = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const configuredPublicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

if (nodeEnv === 'production' && (!configuredPrivateKey || !configuredPublicKey)) {
  throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured in production.');
}

const developmentKeys = !configuredPrivateKey || !configuredPublicKey
  ? generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
  : undefined;

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'scape',
    user: process.env.POSTGRES_USER || 'scape_user',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    privateKey: configuredPrivateKey && configuredPublicKey ? configuredPrivateKey : developmentKeys!.privateKey,
    publicKey: configuredPrivateKey && configuredPublicKey ? configuredPublicKey : developmentKeys!.publicKey,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accountId: process.env.AWS_ACCOUNT_ID || '',
    provisioningRoleArn: process.env.AWS_PROVISIONING_ROLE_ARN || '',
    costExplorerRoleArn: process.env.AWS_COST_EXPLORER_ROLE_ARN || '',
  },

  terraform: {
    stateBucket: process.env.TF_STATE_BUCKET || 'scape-tf-state',
    lockTable: process.env.TF_LOCK_TABLE || 'scape-tf-locks',
    applyTimeoutMs: parseInt(process.env.TF_APPLY_TIMEOUT_MS || '600000', 10),   // 10 min
    destroyTimeoutMs: parseInt(process.env.TF_DESTROY_TIMEOUT_MS || '300000', 10), // 5 min
  },

  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKeyPath: process.env.GITHUB_APP_PRIVATE_KEY_PATH || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    installationId: process.env.GITHUB_APP_INSTALLATION_ID || '',
    repositoryOwner: process.env.GITHUB_REPOSITORY_OWNER || '',
    templateOwner: process.env.GITHUB_TEMPLATE_OWNER || '',
    nodejsApiTemplateRepo: process.env.GITHUB_NODEJS_API_TEMPLATE_REPO || '',
    staticFrontendTemplateRepo: process.env.GITHUB_STATIC_FRONTEND_TEMPLATE_REPO || '',
  },

  publicUrl: process.env.SCAPE_PUBLIC_URL || process.env.PUBLIC_URL || '',
} as const;
