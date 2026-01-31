/**
 * Pricing Rules Hooks
 * React Query hooks wrapping the pricing REST API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi, PricingConfig, PricingRule } from '@/lib/api/pricing';

// Query Keys
export const pricingRuleKeys = {
  all: ['pricing'] as const,
  config: () => [...pricingRuleKeys.all, 'config'] as const,
};

/**
 * Fetch complete pricing configuration (rules, modifiers, categories, brands)
 */
export function usePricingConfigApi() {
  return useQuery({
    queryKey: pricingRuleKeys.config(),
    queryFn: async () => {
      const response = await pricingApi.getConfig();
      if (!response.success) throw new Error(response.error?.message || 'Failed to fetch pricing config');
      return response.data as PricingConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new pricing rule
 */
export function useCreatePricingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await pricingApi.createRule(data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create pricing rule');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingRuleKeys.config() });
    },
  });
}

/**
 * Update an existing pricing rule
 */
export function useUpdatePricingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PricingRule> }) => {
      const response = await pricingApi.updateRule(id, data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update pricing rule');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingRuleKeys.config() });
    },
  });
}

/**
 * Delete a pricing rule
 */
export function useDeletePricingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await pricingApi.deleteRule(id);
      if (!response.success) throw new Error(response.error?.message || 'Failed to delete pricing rule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingRuleKeys.config() });
    },
  });
}
