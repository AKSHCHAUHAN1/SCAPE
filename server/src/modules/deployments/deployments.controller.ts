import { Request, Response, NextFunction } from 'express';
import * as deploymentsService from './deployments.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const deployment = await deploymentsService.createDeployment(
      req.body,
      req.user!.userId,
      req.user!.teamId,
      req.user!.role,
    );
    res.status(201).json(deployment);
  } catch (err) {
    next(err);
  }
}

export async function getByServiceId(req: Request, res: Response, next: NextFunction) {
  try {
    const serviceId = (req.params.serviceId || req.params.id) as string;
    const deployments = await deploymentsService.getDeploymentsByServiceId(
      serviceId,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(deployments);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const deployment = await deploymentsService.getDeploymentById(
      req.params.id as string,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(deployment);
  } catch (err) {
    next(err);
  }
}
