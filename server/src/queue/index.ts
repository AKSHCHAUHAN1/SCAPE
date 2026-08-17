import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';

/**
 * Redis connection for BullMQ job queue.
 */
export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null, // Required by BullMQ
});

/**
 * Provisioning job queue.
 * Services enqueue Terraform provisioning jobs here;
 * workers pick them up asynchronously.
 */
export const provisioningQueue = new Queue('provisioning', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
