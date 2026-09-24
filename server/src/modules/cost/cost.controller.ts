import { Request, Response, NextFunction } from 'express';
import * as costService from './cost.service.js';

export async function getByServiceId(req: Request, res: Response, next: NextFunction) {
  try {
    const serviceId = (req.params.serviceId || req.params.id) as string;
    const period = req.query.period as string | undefined;

    const costs = await costService.getCostsByServiceId(
      serviceId,
      period,
      req.user!.teamId,
      req.user!.role,
    );
    res.json(costs);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await costService.getCostSummary(
      req.user!.teamId,
      req.user!.role,
    );
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function triggerSync(_req: Request, res: Response, next: NextFunction) {
  try {
    const syncedCount = await costService.syncDailyCosts();
    res.json({ message: 'Cost sync completed', syncedCount });
  } catch (err) {
    next(err);
  }
}
