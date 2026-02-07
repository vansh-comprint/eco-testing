/**
 * Pricing Configuration Hooks
 * React Query hooks for managing pricing settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllPricingConfig,
  fetchDeviceTypePricing,
  fetchCpuTierPricing,
  fetchRamTierPricing,
  fetchStorageTierPricing,
  fetchGradePricing,
  fetchDepreciationRules,
  fetchRedemptionRates,
  fetchBrandAdjustments,
} from '@/lib/db/queries';
import {
  updateDeviceTypePricing,
  updateCpuTierPricing,
  updateRamTierPricing,
  updateStorageTierPricing,
  updateGradePricing,
  updateDepreciationRule,
  updateRedemptionRate,
  updateBrandAdjustment,
  createCpuTier,
  createStorageTier,
  createBrandAdjustment,
} from '@/lib/db/mutations';

// Query Keys
export const pricingKeys = {
  all: ['pricing'] as const,
  config: () => [...pricingKeys.all, 'config'] as const,
  deviceTypes: () => [...pricingKeys.all, 'deviceTypes'] as const,
  cpuTiers: () => [...pricingKeys.all, 'cpuTiers'] as const,
  ramTiers: () => [...pricingKeys.all, 'ramTiers'] as const,
  storageTiers: () => [...pricingKeys.all, 'storageTiers'] as const,
  grades: () => [...pricingKeys.all, 'grades'] as const,
  depreciation: () => [...pricingKeys.all, 'depreciation'] as const,
  redemption: () => [...pricingKeys.all, 'redemption'] as const,
  brands: () => [...pricingKeys.all, 'brands'] as const,
};

// Fetch all pricing config at once
export function usePricingConfig() {
  return useQuery({
    queryKey: pricingKeys.config(),
    queryFn: fetchAllPricingConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes - pricing doesn't change often
  });
}

// Individual pricing hooks
export function useDeviceTypePricing() {
  return useQuery({
    queryKey: pricingKeys.deviceTypes(),
    queryFn: fetchDeviceTypePricing,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCpuTierPricing() {
  return useQuery({
    queryKey: pricingKeys.cpuTiers(),
    queryFn: fetchCpuTierPricing,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRamTierPricing() {
  return useQuery({
    queryKey: pricingKeys.ramTiers(),
    queryFn: fetchRamTierPricing,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStorageTierPricing() {
  return useQuery({
    queryKey: pricingKeys.storageTiers(),
    queryFn: fetchStorageTierPricing,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGradePricing() {
  return useQuery({
    queryKey: pricingKeys.grades(),
    queryFn: fetchGradePricing,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepreciationRules() {
  return useQuery({
    queryKey: pricingKeys.depreciation(),
    queryFn: fetchDepreciationRules,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRedemptionRates() {
  return useQuery({
    queryKey: pricingKeys.redemption(),
    queryFn: fetchRedemptionRates,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandAdjustments() {
  return useQuery({
    queryKey: pricingKeys.brands(),
    queryFn: fetchBrandAdjustments,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useUpdateDeviceTypePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateDeviceTypePricing>[1] }) =>
      updateDeviceTypePricing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.deviceTypes() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateCpuTierPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateCpuTierPricing>[1] }) =>
      updateCpuTierPricing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.cpuTiers() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateRamTierPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateRamTierPricing>[1] }) =>
      updateRamTierPricing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.ramTiers() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateStorageTierPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateStorageTierPricing>[1] }) =>
      updateStorageTierPricing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.storageTiers() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateGradePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateGradePricing>[1] }) =>
      updateGradePricing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.grades() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateDepreciationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateDepreciationRule>[1] }) =>
      updateDepreciationRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.depreciation() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateRedemptionRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateRedemptionRate>[1] }) =>
      updateRedemptionRate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.redemption() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useUpdateBrandAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateBrandAdjustment>[1] }) =>
      updateBrandAdjustment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.brands() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

// Create mutations
export function useCreateCpuTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCpuTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.cpuTiers() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useCreateStorageTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStorageTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.storageTiers() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

export function useCreateBrandAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBrandAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.brands() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.config() });
    },
  });
}

// Types
export interface DeviceTypePricing {
  id: string;
  device_type: string;
  display_name: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CpuTierPricing {
  id: string;
  tier_name: string;
  tier_level: number;
  multiplier: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RamTierPricing {
  id: string;
  ram_size_gb: number;
  multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StorageTierPricing {
  id: string;
  storage_type: 'hdd' | 'ssd' | 'nvme';
  storage_size_gb: number;
  multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface GradePricing {
  id: string;
  grade: string;
  condition_name: string;
  multiplier: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DepreciationRule {
  id: string;
  min_age_months: number;
  max_age_months?: number;
  depreciation_rate: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RedemptionRate {
  id: string;
  redemption_type: string;
  display_name: string;
  rate: number;
  description?: string;
  min_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BrandAdjustment {
  id: string;
  brand_name: string;
  adjustment_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PricingConfig {
  deviceTypes: DeviceTypePricing[];
  cpuTiers: CpuTierPricing[];
  ramTiers: RamTierPricing[];
  storageTiers: StorageTierPricing[];
  grades: GradePricing[];
  depreciation: DepreciationRule[];
  redemption: RedemptionRate[];
  brands: BrandAdjustment[];
}

// Utility function to calculate device price
export function calculateDevicePrice(params: {
  deviceType: string;
  cpuTier?: string;
  ramGb?: number;
  storageType?: 'hdd' | 'ssd' | 'nvme';
  storageGb?: number;
  brand?: string;
  ageMonths?: number;
  grade?: string;
  pricingConfig: PricingConfig;
}): {
  basePrice: number;
  cpuMultiplier: number;
  ramMultiplier: number;
  storageMultiplier: number;
  brandMultiplier: number;
  depreciationRate: number;
  gradeMultiplier: number;
  finalPrice: number;
  breakdown: string[];
} {
  const {
    deviceType,
    cpuTier,
    ramGb,
    storageType,
    storageGb,
    brand,
    ageMonths = 0,
    grade,
    pricingConfig,
  } = params;

  const breakdown: string[] = [];

  // Get base price from device type
  const devicePricing = pricingConfig.deviceTypes.find(d => d.device_type === deviceType);
  const basePrice = devicePricing?.base_price || 0;
  breakdown.push(`Base (${deviceType}): ₹${basePrice.toLocaleString()}`);

  // CPU multiplier
  let cpuMultiplier = 1.0;
  if (cpuTier) {
    const cpuPricing = pricingConfig.cpuTiers.find(c => c.tier_name === cpuTier);
    if (cpuPricing) {
      cpuMultiplier = cpuPricing.multiplier;
      breakdown.push(`CPU (${cpuTier}): ×${cpuMultiplier}`);
    }
  }

  // RAM multiplier
  let ramMultiplier = 1.0;
  if (ramGb) {
    const ramPricing = pricingConfig.ramTiers.find(r => r.ram_size_gb === ramGb);
    if (ramPricing) {
      ramMultiplier = ramPricing.multiplier;
      breakdown.push(`RAM (${ramGb}GB): ×${ramMultiplier}`);
    }
  }

  // Storage multiplier
  let storageMultiplier = 1.0;
  if (storageType && storageGb) {
    const storagePricing = pricingConfig.storageTiers.find(
      s => s.storage_type === storageType && s.storage_size_gb === storageGb
    );
    if (storagePricing) {
      storageMultiplier = storagePricing.multiplier;
      breakdown.push(`Storage (${storageType.toUpperCase()} ${storageGb}GB): ×${storageMultiplier}`);
    }
  }

  // Brand multiplier
  let brandMultiplier = 1.0;
  if (brand) {
    const brandPricing = pricingConfig.brands.find(
      b => b.brand_name.toLowerCase() === brand.toLowerCase()
    );
    if (brandPricing) {
      brandMultiplier = brandPricing.adjustment_multiplier;
      breakdown.push(`Brand (${brand}): ×${brandMultiplier}`);
    }
  }

  // Depreciation
  let depreciationRate = 0;
  if (ageMonths > 0) {
    const depRule = pricingConfig.depreciation.find(
      d => ageMonths >= d.min_age_months && (d.max_age_months === null || d.max_age_months === undefined || ageMonths < d.max_age_months)
    );
    if (depRule) {
      depreciationRate = depRule.depreciation_rate;
      breakdown.push(`Age (${ageMonths} months): -${(depreciationRate * 100).toFixed(0)}%`);
    }
  }

  // Grade multiplier
  let gradeMultiplier = 1.0;
  if (grade) {
    const gradePricing = pricingConfig.grades.find(g => g.grade === grade);
    if (gradePricing) {
      gradeMultiplier = gradePricing.multiplier;
      breakdown.push(`Grade (${grade}): ×${gradeMultiplier}`);
    }
  }

  // Calculate final price
  const specAdjustedPrice = basePrice * cpuMultiplier * ramMultiplier * storageMultiplier * brandMultiplier;
  const afterDepreciation = specAdjustedPrice * (1 - depreciationRate);
  const finalPrice = afterDepreciation * gradeMultiplier;

  breakdown.push(`Final Price: ₹${Math.round(finalPrice).toLocaleString()}`);

  return {
    basePrice,
    cpuMultiplier,
    ramMultiplier,
    storageMultiplier,
    brandMultiplier,
    depreciationRate,
    gradeMultiplier,
    finalPrice: Math.round(finalPrice),
    breakdown,
  };
}
