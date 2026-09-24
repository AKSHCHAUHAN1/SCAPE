import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../api/templates.js';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getTemplates(),
    staleTime: 60000,
  });
}
