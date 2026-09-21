import { Request, Response, NextFunction } from 'express';
import * as templatesService from './templates.service.js';

/**
 * GET /templates
 */
export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await templatesService.getAllTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /templates/:id
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await templatesService.getTemplateById(req.params.id as string);
    res.json(template);
  } catch (err) {
    next(err);
  }
}
