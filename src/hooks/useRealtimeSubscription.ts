import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { queryKeys } from '../lib/queryKeys';
import { logger } from '../lib/logger';

type RealtimeTable = 'devotionals' | 'prayers' | 'events' | 'event_rsvps' | 'devotional_likes' | 'devotional_comments';
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Custom hook to subscribe to Supabase realtime changes and automatically
 * invalidate relevant React Query caches
 */
export const useRealtimeSubscription = (
  table: RealtimeTable,
  options?: {
    event?: RealtimeEvent;
    filter?: string;
    enabled?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const enabled = options?.enabled !== false && !!groupId;

  useEffect(() => {
    if (!enabled || !groupId) {
      return;
    }

    // Create channel name based on table and group
    const channelName = `${table}-${groupId}`;

    logger.info(`Setting up realtime subscription for ${table}`, { groupId });

    // Create channel
    const channel = supabase.channel(channelName);

    // Set up postgres changes listener
    const eventType = options?.event || '*';
    const filter = options?.filter || `group_id=eq.${groupId}`;

    channel.on(
      'postgres_changes',
      {
        event: eventType,
        schema: 'public',
        table,
        filter,
      },
      (payload) => {
        logger.info(`Realtime ${eventType} event received for ${table}`, {
          eventType: payload.eventType,
          table: payload.table,
        });

        // Invalidate relevant queries based on table
        switch (table) {
          case 'devotionals':
            // Invalidate all devotional queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.devotionals.all(),
            });
            break;

          case 'prayers':
            // Invalidate all prayer queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.prayers.all(),
            });
            break;

          case 'events':
            // Invalidate all event queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.events.all(),
            });
            break;

          case 'event_rsvps':
            // Invalidate event queries (RSVPs affect event data)
            queryClient.invalidateQueries({
              queryKey: queryKeys.events.all(),
            });
            break;

          case 'devotional_likes':
            // Invalidate devotional queries (likes affect devotional data)
            queryClient.invalidateQueries({
              queryKey: queryKeys.devotionals.all(),
            });
            break;

          case 'devotional_comments':
            // Invalidate devotional completions (comments affect completions)
            queryClient.invalidateQueries({
              queryKey: queryKeys.devotionals.all(),
            });
            break;

          default:
            logger.warn(`Unknown realtime table: ${table}`);
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info(`Successfully subscribed to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        logger.error(`Error subscribing to ${channelName}`, new Error('Channel error'));
      } else if (status === 'TIMED_OUT') {
        logger.error(`Timed out subscribing to ${channelName}`, new Error('Timeout'));
      } else if (status === 'CLOSED') {
        logger.info(`Channel ${channelName} closed`);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        logger.info(`Unsubscribing from ${channelName}`);
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [enabled, groupId, table, options?.event, options?.filter]);
};

/**
 * Hook to enable realtime for devotionals
 */
export const useDevotionalsRealtime = () => {
  useRealtimeSubscription('devotionals', { event: '*' });
  useRealtimeSubscription('devotional_likes', { event: '*' });
  useRealtimeSubscription('devotional_comments', { event: '*' });
};

/**
 * Hook to enable realtime for prayers
 */
export const usePrayersRealtime = () => {
  useRealtimeSubscription('prayers', { event: '*' });
};

/**
 * Hook to enable realtime for events
 */
export const useEventsRealtime = () => {
  useRealtimeSubscription('events', { event: '*' });
  useRealtimeSubscription('event_rsvps', { event: '*' });
};
