import { Request, Response, NextFunction } from 'express';
import * as teamsService from './teams.service.js';

/**
 * GET /teams
 */
export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const teams = await teamsService.getAllTeams();
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /teams
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamsService.createTeam(req.body);
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamsService.getTeamById(req.params.id as string);
    res.json(team);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id/members
 */
export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await teamsService.getTeamMembers(req.params.id as string);
    res.json(members);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /teams/:id/members
 */
export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await teamsService.addTeamMember(req.params.id as string, req.body.userId);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}
