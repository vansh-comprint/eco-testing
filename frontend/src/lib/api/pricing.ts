/**
 * Pricing API Module
 * Pricing rules and calculation endpoints
 */

import { fetchWithAuth } from './client';

// ============================================================================
// Types
// ============================================================================

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  model_pattern?: string;
  age_min: number;
  age_max?: number;
  base_price: number;
  grade_modifiers: Record<string, number>;
  priority: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConditionModifier {
  id: string;
  condition_name: string;
  display_name: string;
  description?: string;
  modifier: number;
  sort_order: number;
  is_active: boolean;
}

export interface PricingConfig {
  pricing_rules: PricingRule[];
  condition_modifiers: ConditionModifier[];
  categories: string[];
  brands: string[];
}

export interface PriceCalculationRequest {
  category: string;
  brand?: string;
  model?: string;
  age_years: number;
  grade: string;
  condition?: string;
}

export interface PriceCalculationResponse {
  base_price: number;
  grade_modifier: number;
  condition_modifier: number;
  final_price: number;
  pricing_rule_id?: string;
  pricing_rule_name?: string;
  breakdown: Record<string, unknown>;
}

// ============================================================================
// API
// ============================================================================

export const pricingApi = {
  getConfig: () =>
    fetchWithAuth<PricingConfig>('/pricing'),

  listRules: (params?: { category?: string; brand?: string; is_active?: boolean; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      if (params.category) query.append('category', params.category);
      if (params.brand) query.append('brand', params.brand);
      if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
      if (params.skip !== undefined) query.append('skip', String(params.skip));
      if (params.limit !== undefined) query.append('limit', String(params.limit));
    }
    const qs = query.toString();
    return fetchWithAuth<PricingRule[]>(`/pricing/rules${qs ? `?${qs}` : ''}`);
  },

  getRule: (id: string) =>
    fetchWithAuth<PricingRule>(`/pricing/rules/${id}`),

  createRule: (data: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>) =>
    fetchWithAuth<PricingRule>('/pricing/rules', { method: 'POST', body: JSON.stringify(data) }),

  updateRule: (id: string, data: Partial<PricingRule>) =>
    fetchWithAuth<PricingRule>(`/pricing/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteRule: (id: string) =>
    fetchWithAuth<void>(`/pricing/rules/${id}`, { method: 'DELETE' }),

  listModifiers: (activeOnly = true) =>
    fetchWithAuth<ConditionModifier[]>(`/pricing/modifiers?active_only=${activeOnly}`),

  updateModifier: (id: string, data: Partial<ConditionModifier>) =>
    fetchWithAuth<ConditionModifier>(`/pricing/modifiers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  calculatePrice: (request: PriceCalculationRequest) =>
    fetchWithAuth<PriceCalculationResponse>('/pricing/calculate', { method: 'POST', body: JSON.stringify(request) }),
};
