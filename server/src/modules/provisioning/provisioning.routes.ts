import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as provisioningController from './provisioning.controller.js';

export const provisioningRoutes = Router();

// Notice: GET /services/:serviceId/jobs is mounted in app.ts under a different base,
// but for simplicity, we export the routes and let app.ts map them correctly.
provisioningRoutes.get('/:id', authenticate, provisioningController.getJobById);
provisioningRoutes.post('/:id/retry', authenticate, authorize('admin', 'devops', 'team_lead'), provisioningController.retryJob);

export const serviceJobRoutes = Router();
serviceJobRoutes.get('/:serviceId/jobs', authenticate, provisioningController.getJobsByServiceId);
