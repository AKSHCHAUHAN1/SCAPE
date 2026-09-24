import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as costController from './cost.controller.js';

export const costRoutes = Router();

costRoutes.get('/', authenticate, costController.getSummary);
costRoutes.get('/summary', authenticate, costController.getSummary);
costRoutes.post('/sync', authenticate, authorize('admin', 'devops'), costController.triggerSync);

export const serviceCostRoutes = Router();
serviceCostRoutes.get('/:serviceId/costs', authenticate, costController.getByServiceId);
