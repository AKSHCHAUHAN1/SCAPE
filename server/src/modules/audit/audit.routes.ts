import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as auditController from './audit.controller.js';

export const auditRoutes = Router();

// Only admins can view the global audit log
auditRoutes.get('/', authenticate, authorize('admin'), auditController.getAll);
