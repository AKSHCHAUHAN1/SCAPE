import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costsApi } from '../api/costs.js';

export function useCostSummary() {
  return useQuery({
    queryKey: ['costSummary'],
    queryFn: () => costsApi.getCostSummary(),
    staleTime: 30000,
  });
}

export function useTriggerCostSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => costsApi.triggerSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costSummary'] });
      queryClient.invalidateQueries({ queryKey: ['serviceCosts'] });
    },
  });
}
