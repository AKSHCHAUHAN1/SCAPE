import { syncDailyCosts } from './cost.service.js';
import { logger } from '../../utils/logger.js';

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
let initialTimeout: NodeJS.Timeout | null = null;
let intervalId: NodeJS.Timeout | null = null;

async function runDailyCostSync() {
  try {
    const syncedCount = await syncDailyCosts();
    logger.info({ syncedCount }, 'Daily AWS Cost Explorer sync completed');
  } catch (err) {
    logger.error({ err }, 'Daily AWS Cost Explorer sync failed');
  }
}

function millisecondsUntilNextFourUtc() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(4, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

/** Schedule the AWS billing sync once per day at 04:00 UTC. */
export function startCostScheduler() {
  stopCostScheduler();
  const delayMs = millisecondsUntilNextFourUtc();
  logger.info({ firstRunInMs: delayMs }, 'Cost sync scheduled for 04:00 UTC');

  initialTimeout = setTimeout(() => {
    void runDailyCostSync();
    intervalId = setInterval(() => void runDailyCostSync(), DAILY_INTERVAL_MS);
  }, delayMs);
}

export function stopCostScheduler() {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
