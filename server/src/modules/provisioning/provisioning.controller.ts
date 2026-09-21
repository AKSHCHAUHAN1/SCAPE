import { Request, Response, NextFunction } from 'express';
import * as provisioningService from './provisioning.service.js';

/**
 * GET /services/:id/jobs
 */
export async function getJobsByServiceId(req: Request, res: Response, next: NextFunction) {
  try {
    const jobs = await provisioningService.getJobsByServiceId(
      req.params.serviceId as string,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /jobs/:id
 */
export async function getJobById(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await provisioningService.getJobById(
      req.params.id as string,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(job);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /jobs/:id/retry
 */
export async function retryJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await provisioningService.retryJob(
      req.params.id as string,
      req.user!.userId,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(job);
  } catch (err) {
    next(err);
  }
}
