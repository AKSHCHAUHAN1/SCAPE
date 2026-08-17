import { Router } from 'express';
import { getHealth, getReady } from './health.controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', getHealth);
healthRoutes.get('/ready', getReady);
