import { Router } from 'express';
import * as webhookController from './webhook.controller.js';

export const webhookRoutes = Router();

// Webhook endpoint from GitHub Actions callback
webhookRoutes.post('/github', webhookController.handleGitHubWebhook);
