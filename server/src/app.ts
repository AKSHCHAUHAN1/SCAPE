import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Route imports
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { teamRoutes } from './modules/teams/teams.routes.js';
import { templateRoutes } from './modules/templates/templates.routes.js';
import { serviceRoutes } from './modules/services/services.routes.js';
import { provisioningRoutes, serviceJobRoutes } from './modules/provisioning/provisioning.routes.js';
// import { deploymentRoutes } from './modules/deployments/deployments.routes.js';
// import { costRoutes } from './modules/cost/cost.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
// import { webhookRoutes } from './modules/cicd/webhook.routes.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();

// ---- Global Middleware ----
app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// ---- Routes ----
app.use('/health', healthRoutes);
app.use('/auth', rateLimiter, authRoutes);
app.use('/users', userRoutes);
app.use('/teams', teamRoutes);
app.use('/templates', templateRoutes);
app.use('/services', serviceRoutes);
app.use('/services', serviceJobRoutes); // GET /services/:serviceId/jobs
app.use('/jobs', provisioningRoutes);
// app.use('/deployments', deploymentRoutes);
// app.use('/costs', costRoutes);
app.use('/audit-logs', auditRoutes);
// app.use('/webhooks', webhookRoutes);

// ---- Error Handling ----
app.use(errorHandler);

export default app;
