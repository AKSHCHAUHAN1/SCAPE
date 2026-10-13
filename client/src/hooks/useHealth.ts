import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health.js';

/**
 * Polls /health/metrics every 15 seconds — powers the real-time dashboard.
 */
export function usePlatformMetrics() {
  return useQuery({
    queryKey: ['platformMetrics'],
    queryFn: () => healthApi.getMetrics(),
    refetchInterval: 15000, // refresh every 15 s for near-real-time feel
    staleTime: 10000,
  });
}

/**
 * Single-shot readiness check.
 */
export function useHealthReady() {
  return useQuery({
    queryKey: ['healthReady'],
    queryFn: () => healthApi.getReady(),
    refetchInterval: 30000,
    staleTime: 20000,
  });
}
