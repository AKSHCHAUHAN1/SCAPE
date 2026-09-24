import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createDeploymentSchema } from './deployments.schema.js';
import * as deploymentsController from './deployments.controller.js';

export const deploymentRoutes = Router();

deploymentRoutes.post('/', authenticate, validate(createDeploymentSchema), deploymentsController.create);
deploymentRoutes.get('/:id', authenticate, deploymentsController.getById);

export const serviceDeploymentRoutes = Router();
serviceDeploymentRoutes.get('/:serviceId/deployments', authenticate, deploymentsController.getByServiceId);
