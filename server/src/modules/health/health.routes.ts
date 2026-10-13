import { Router } from 'express';
import { getHealth, getReady, getMetrics } from './health.controller.js';
import { authenticate } from '../../middleware/auth.js';

export const healthRoutes = Router();

// Public endpoints — no auth required (for load balancer probes)
healthRoutes.get('/', getHealth);
healthRoutes.get('/ready', getReady);

// Authenticated — returns extended platform metrics for the dashboard
healthRoutes.get('/metrics', authenticate, getMetrics);
