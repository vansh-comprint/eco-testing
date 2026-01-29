/**
 * Notifications API Module
 * User notification management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface NotificationResponse {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface NotificationListParams {
  skip?: number;
  limit?: number;
  is_read?: boolean;
}

// ============================================================================
// API
// ============================================================================

export const notificationsApi = {
  list: (params: NotificationListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.is_read !== undefined) query.set('is_read', params.is_read.toString());
    return fetchWithAuth<NotificationResponse[]>(`/notifications?${query.toString()}`);
  },

  markRead: (id: string) =>
    fetchWithAuth<NotificationResponse>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () =>
    fetchWithAuth<void>('/notifications/read-all', { method: 'POST' }),
};
