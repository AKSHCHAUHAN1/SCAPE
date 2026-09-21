import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTeamSchema, addMemberSchema } from './teams.schema.js';
import * as teamsController from './teams.controller.js';

export const teamRoutes = Router();

teamRoutes.get('/', authenticate, teamsController.getAll);
teamRoutes.post('/', authenticate, authorize('admin', 'devops'), validate(createTeamSchema), teamsController.create);
teamRoutes.get('/:id', authenticate, teamsController.getById);
teamRoutes.get('/:id/members', authenticate, teamsController.getMembers);
teamRoutes.post('/:id/members', authenticate, authorize('admin', 'devops', 'team_lead'), validate(addMemberSchema), teamsController.addMember);
