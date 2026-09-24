import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/services.js';
import { deploymentsApi } from '../api/deployments.js';
import { costsApi } from '../api/costs.js';
import type { CreateDeploymentInput } from '../types/index.js';

export function useService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => (serviceId ? servicesApi.getService(serviceId) : Promise.reject('No ID')),
    enabled: Boolean(serviceId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'provisioning' || status === 'pending' ? 5000 : false;
    },
  });
}

export function useServiceJobs(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['serviceJobs', serviceId],
    queryFn: () => (serviceId ? servicesApi.getServiceJobs(serviceId) : Promise.reject('No ID')),
    enabled: Boolean(serviceId),
    refetchInterval: (query) => {
      const jobs = query.state.data;
      const isRunning = jobs?.some((j) => j.status === 'running' || j.status === 'queued');
      return isRunning ? 5000 : false;
    },
  });
}

export function useServiceDeployments(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['serviceDeployments', serviceId],
    queryFn: () => (serviceId ? deploymentsApi.getServiceDeployments(serviceId) : Promise.reject('No ID')),
    enabled: Boolean(serviceId),
    refetchInterval: 10000,
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeploymentInput) => deploymentsApi.createDeployment(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceDeployments', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service', variables.serviceId] });
    },
  });
}

export function useServiceCosts(serviceId: string | undefined, period?: string) {
  return useQuery({
    queryKey: ['serviceCosts', serviceId, period],
    queryFn: () => (serviceId ? costsApi.getServiceCosts(serviceId, period) : Promise.reject('No ID')),
    enabled: Boolean(serviceId),
  });
}

export function useRetryProvisioningJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => servicesApi.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceJobs'] });
      queryClient.invalidateQueries({ queryKey: ['service'] });
    },
  });
}
