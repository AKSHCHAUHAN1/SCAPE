import { syncDailyCosts } from './cost.service.js';
import { logger } from '../../utils/logger.js';

let intervalId: NodeJS.Timeout | null = null;

/**
 * Start cost sync background worker.
 * Checks costs every 6 hours or upon start.
 */
export function startCostScheduler(intervalMs = 6 * 60 * 60 * 1000) {
  logger.info('Initializing Cost Sync Scheduler');

  // Initial sync attempt after 10 seconds of server startup
  setTimeout(async () => {
    try {
      await syncDailyCosts();
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Initial cost sync deferred');
    }
  }, 10000);

  intervalId = setInterval(async () => {
    try {
      logger.info('Running periodic AWS Cost Explorer sync');
      await syncDailyCosts();
    } catch (err: any) {
      logger.error({ err }, 'Error in cost sync scheduler');
    }
  }, intervalMs);
}

export function stopCostScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
