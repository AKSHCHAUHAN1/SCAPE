import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Team name may only contain letters, numbers, spaces, hyphens, and underscores'),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
