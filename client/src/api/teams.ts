import apiClient from './index.js';
import type { Team, User } from '../types/index.js';

export const teamsApi = {
  /**
   * Fetch all teams.
   */
  async getTeams(): Promise<Team[]> {
    const { data } = await apiClient.get<Team[]>('/teams');
    return data;
  },

  /**
   * Fetch team by ID.
   */
  async getTeam(id: string): Promise<Team> {
    const { data } = await apiClient.get<Team>(`/teams/${id}`);
    return data;
  },

  /**
   * Fetch members of a team.
   */
  async getTeamMembers(teamId: string): Promise<User[]> {
    const { data } = await apiClient.get<User[]>(`/teams/${teamId}/members`);
    return data;
  },
};
