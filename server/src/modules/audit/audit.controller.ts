import { Request, Response, NextFunction } from 'express';
import * as auditService from './audit.service.js';

/**
 * GET /audit-logs
 */
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const resourceId = req.query.resourceId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const logs = await auditService.getAuditLogs({ resourceId, limit, offset });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}
