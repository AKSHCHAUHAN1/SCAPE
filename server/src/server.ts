import 'dotenv/config';
import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 SCAPE server running on http://localhost:${PORT}`);
  logger.info(`   Environment: ${config.nodeEnv}`);
});
