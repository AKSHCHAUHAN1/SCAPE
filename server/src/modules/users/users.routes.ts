import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as usersController from './users.controller.js';

export const userRoutes = Router();

userRoutes.get('/me', authenticate, usersController.getMe);
userRoutes.patch('/me', authenticate, usersController.updateMe);
