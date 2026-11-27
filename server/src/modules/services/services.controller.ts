import { Request, Response, NextFunction } from 'express';
import * as servicesService from './services.service.js';

/**
 * POST /services
 * Creates a new service and enqueues a provisioning job.
 * Returns 202 Accepted (async provisioning).
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await servicesService.createService(
      req.body,
      req.user!.userId,
    );
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /services
 */
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const services = await servicesService.getAllServices(req.user!.userId);
    res.json(services);
  } catch (err) {
    next(err);
  }
}

/** POST /services/github/repositories/validate */
export async function validateGitHubRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const repository = await servicesService.validateGitHubRepository(req.body.repositoryUrl);
    res.json(repository);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /services/:id
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await servicesService.getServiceById(
      req.params.id as string,
      req.user!.userId,
    );
    res.json(service);
  } catch (err) {
    next(err);
  }
}

/** GET /services/:id/health */
export async function getHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const health = await servicesService.getServiceHealth(
      req.params.id as string,
      req.user!.userId,
    );
    res.json(health);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /services/:id
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await servicesService.deleteService(
      req.params.id as string,
      req.user!.userId,
    );
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}
