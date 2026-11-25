import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costsApi } from '../api/costs.js';
import type { ServiceCostEstimateInput } from '../types/index.js';

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

export function useServiceCostEstimate(input: ServiceCostEstimateInput, enabled: boolean) {
  return useQuery({
    queryKey: ['serviceCostEstimate', input],
    queryFn: () => costsApi.estimateServiceCost(input),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
