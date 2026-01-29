import { useEffect, useRef } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to subscribe to real-time changes from a Supabase table
 *
 * @example
 * ```tsx
 * useSupabaseRealtime('assets', 'enterprise_id=eq.ent-123', (payload) => {
 *   if (payload.eventType === 'INSERT') {
 *     console.log('New asset created:', payload.new);
 *   }
 * });
 * ```
 */
export function useSupabaseRealtime<T = any>(
  table: string,
  filter?: string,
  callback?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: T | null;
  }) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isSupabaseEnabled || !callback) return;

    const channelName = filter
      ? `${table}:${filter}`
      : `${table}:all`;

    console.log('[useSupabaseRealtime] Subscribing to:', channelName);

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          console.log(`[useSupabaseRealtime] ${table} change:`, payload);

          if (callbackRef.current) {
            callbackRef.current({
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as T | null,
              old: payload.old as T | null,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[useSupabaseRealtime] Subscription status:', status);
      });

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log('[useSupabaseRealtime] Unsubscribing from:', channelName);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter]);

  return {
    isEnabled: isSupabaseEnabled,
    channel: channelRef.current,
  };
}

/**
 * Hook to subscribe to multiple tables at once
 *
 * @example
 * ```tsx
 * useSupabaseRealtimeMulti([
 *   { table: 'assets', filter: 'enterprise_id=eq.ent-123', callback: handleAssetChange },
 *   { table: 'submissions', filter: 'sub_user_id=eq.sub-456', callback: handleSubmissionChange },
 * ]);
 * ```
 */
export function useSupabaseRealtimeMulti(
  subscriptions: Array<{
    table: string;
    filter?: string;
    callback: (payload: any) => void;
  }>
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!isSupabaseEnabled || subscriptions.length === 0) return;

    // Subscribe to all tables
    channelsRef.current = subscriptions.map(({ table, filter, callback }) => {
      const channelName = filter ? `${table}:${filter}` : `${table}:all`;

      return supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe();
    });

    // Cleanup all channels
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [subscriptions]);

  return {
    isEnabled: isSupabaseEnabled,
    channels: channelsRef.current,
  };
}

/**
 * Hook to check Supabase connection status
 */
export function useSupabaseStatus() {
  useEffect(() => {
    if (isSupabaseEnabled) {
      console.log('✅ Supabase is enabled and configured');
    } else {
      console.log('ℹ️ Supabase is disabled, using localStorage fallback');
    }
  }, []);

  return {
    isEnabled: isSupabaseEnabled,
    url: import.meta.env.VITE_SUPABASE_URL || null,
  };
}
