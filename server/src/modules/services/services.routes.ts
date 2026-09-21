import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createServiceSchema } from './services.schema.js';
import * as servicesController from './services.controller.js';

export const serviceRoutes = Router();

serviceRoutes.post('/', authenticate, validate(createServiceSchema), servicesController.create);
serviceRoutes.get('/', authenticate, servicesController.getAll);
serviceRoutes.get('/:id', authenticate, servicesController.getById);
serviceRoutes.delete('/:id', authenticate, servicesController.remove);
