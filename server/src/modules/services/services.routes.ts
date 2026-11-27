import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createServiceSchema, validateGitHubRepositorySchema } from './services.schema.js';
import * as servicesController from './services.controller.js';

export const serviceRoutes = Router();

serviceRoutes.post('/', authenticate, validate(createServiceSchema), servicesController.create);
serviceRoutes.get('/', authenticate, servicesController.getAll);
serviceRoutes.post(
  '/github/repositories/validate',
  authenticate,
  validate(validateGitHubRepositorySchema),
  servicesController.validateGitHubRepository,
);
serviceRoutes.get('/:id/health', authenticate, servicesController.getHealth);
serviceRoutes.get('/:id', authenticate, servicesController.getById);
serviceRoutes.delete('/:id', authenticate, servicesController.remove);
