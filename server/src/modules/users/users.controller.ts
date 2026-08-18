import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';

/**
 * GET /users/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserById(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/me
 */
export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(req.user!.userId, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
