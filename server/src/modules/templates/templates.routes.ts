import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as templatesController from './templates.controller.js';

export const templateRoutes = Router();

templateRoutes.get('/', authenticate, templatesController.getAll);
templateRoutes.get('/:id', authenticate, templatesController.getById);
