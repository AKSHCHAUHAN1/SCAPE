/**
 * Centralised application configuration.
 * Reads from environment variables with sensible defaults.
 */
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
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
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
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
  },

  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKeyPath: process.env.GITHUB_APP_PRIVATE_KEY_PATH || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },
} as const;
