/**
 * Payouts & Wallet API Module
 * Financial transaction and wallet management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface WalletResponse {
  id: string;
  enterprise_id: string;
  balance: number;
  credit_limit?: number;
  currency: string;
  created_at: string;
  updated_at?: string;
}

export interface WalletTransactionResponse {
  id: string;
  wallet_id: string;
  payout_id?: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

export interface PayoutResponse {
  id: string;
  enterprise_id: string;
  batch_id?: string;
  asset_ids?: string[];
  amount: number;
  status: string;
  method?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  upi_id?: string;
  initiated_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  transaction_reference?: string;
  transaction_id?: string;
  reference_id?: string;
  processed_by?: string;
  processed_at?: string;
  notes?: string;
  items?: Array<{ asset_id: string; amount: number; description?: string }>;
  batches?: { id: string; name: string } | null;
  processed_by_user?: { id: string; name: string; email: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface PayoutListParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export interface PayoutCreateRequest {
  enterprise_id?: string;
  batch_id?: string;
  amount: number;
  method: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  upi_id?: string;
  notes?: string;
}

// ============================================================================
// Payouts API
// ============================================================================

export const payoutsApi = {
  list: (params: PayoutListParams = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.page_size ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    return fetchWithAuth<PayoutResponse[]>(`/payouts?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<PayoutResponse>(`/payouts/${id}`),

  create: (data: PayoutCreateRequest) =>
    fetchWithAuth<PayoutResponse>('/payouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  process: (id: string, action: 'complete' | 'fail', opts?: { transaction_reference?: string; failure_reason?: string }) =>
    fetchWithAuth<PayoutResponse>(`/payouts/${id}/process`, {
      method: 'POST',
      body: JSON.stringify({ action, ...opts }),
    }),
};

// ============================================================================
// Wallet API
// ============================================================================

export const walletApi = {
  get: (enterpriseId: string) =>
    fetchWithAuth<WalletResponse>(`/payouts/wallet/${enterpriseId}`),

  getTransactions: (enterpriseId: string, params: { skip?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    return fetchWithAuth<WalletTransactionResponse[]>(`/payouts/wallet/${enterpriseId}/transactions?${query.toString()}`);
  },

  credit: (enterpriseId: string, data: { amount: number; description?: string; reference_id?: string }) =>
    fetchWithAuth<{ wallet: WalletResponse; transaction: WalletTransactionResponse }>(`/payouts/wallet/${enterpriseId}/credit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  debit: (enterpriseId: string, data: { amount: number; description?: string; reference_id?: string }) =>
    fetchWithAuth<{ wallet: WalletResponse; transaction: WalletTransactionResponse }>(`/payouts/wallet/${enterpriseId}/debit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
