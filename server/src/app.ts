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
import { deploymentRoutes, serviceDeploymentRoutes } from './modules/deployments/deployments.routes.js';
import { costRoutes, serviceCostRoutes } from './modules/cost/cost.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { webhookRoutes } from './modules/cicd/webhook.routes.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();

// ---- Global Middleware ----
app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

import { getPrometheusMetrics } from './modules/health/health.controller.js';

// ---- Observability & Health Probes (Unthrottled) ----
app.use('/health', healthRoutes);
app.get('/metrics', getPrometheusMetrics);
app.use('/webhooks', webhookRoutes);

// ---- API Routes (Protected by Rate Limiter) ----
app.use('/auth', rateLimiter, authRoutes);
app.use('/users', rateLimiter, userRoutes);
app.use('/teams', rateLimiter, teamRoutes);
app.use('/templates', rateLimiter, templateRoutes);
app.use('/services', rateLimiter, serviceRoutes);
app.use('/services', rateLimiter, serviceJobRoutes); // GET /services/:serviceId/jobs
app.use('/services', rateLimiter, serviceDeploymentRoutes); // GET /services/:serviceId/deployments
app.use('/services', rateLimiter, serviceCostRoutes); // GET /services/:serviceId/costs
app.use('/jobs', rateLimiter, provisioningRoutes);
app.use('/deployments', rateLimiter, deploymentRoutes);
app.use('/costs', rateLimiter, costRoutes);
app.use('/audit-logs', rateLimiter, auditRoutes);

// ---- Error Handling ----
app.use(errorHandler);

export default app;
