import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { Tables } from '../../types/database';

type Event = Tables<'events'>;
type EventRsvp = Tables<'event_rsvps'>;

export interface EventWithRsvps extends Event {
  rsvp_counts?: {
    going: number;
    maybe: number;
    not_going: number;
  };
  user_rsvp?: 'going' | 'maybe' | 'not_going' | null;
}

export interface RsvpWithProfile extends EventRsvp {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Fetch events (upcoming or past)
const fetchEvents = async (groupId: string, filterType: 'upcoming' | 'past') => {
  const now = new Date().toISOString();

  let query = supabase
    .from('events')
    .select('*')
    .eq('group_id', groupId)
    .order('event_date', { ascending: true });

  if (filterType === 'upcoming') {
    query = query.gte('event_date', now);
  } else {
    query = query.lt('event_date', now);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Event[];
};

// Fetch recent upcoming events (for home screen)
const fetchRecentEvents = async (groupId: string, limit: number = 2) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('group_id', groupId)
    .gte('event_date', now)
    .order('event_date', { ascending: true })
    .limit(limit);

  if (error) throw error;

  // Fetch RSVP counts for each event
  if (data && data.length > 0) {
    const eventsWithCounts = await Promise.all(
      data.map(async (event) => {
        const { count } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'going');

        return {
          ...event,
          rsvp_count: count || 0,
        };
      })
    );
    return eventsWithCounts;
  }

  return data.map((event) => ({ ...event, rsvp_count: 0 }));
};

// Fetch RSVPs for an event
const fetchEventRsvps = async (eventId: string) => {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('event_id', eventId);

  if (error) throw error;
  return data as RsvpWithProfile[];
};

// Count RSVPs by status
const countRsvps = (rsvps: EventRsvp[]) => {
  return {
    going: rsvps.filter((r) => r.status === 'going').length,
    maybe: rsvps.filter((r) => r.status === 'maybe').length,
    not_going: rsvps.filter((r) => r.status === 'not_going').length,
  };
};

// Hook: Fetch upcoming or past events
export const useEventsQuery = (filterType: 'upcoming' | 'past' = 'upcoming') => {
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;

  const queryKey = filterType === 'upcoming'
    ? queryKeys.events.upcoming(groupId || '')
    : queryKeys.events.past(groupId || '');

  return useQuery({
    queryKey,
    queryFn: () => fetchEvents(groupId!, filterType),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook: Fetch recent events (for home screen)
export const useRecentEventsQuery = (limit: number = 2) => {
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;

  return useQuery({
    queryKey: [...queryKeys.events.upcoming(groupId || ''), 'recent', limit],
    queryFn: () => fetchRecentEvents(groupId!, limit),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches home screen cache
  });
};

// Hook: Fetch RSVPs for an event
export const useEventRsvpsQuery = (eventId: string | null) => {
  return useQuery({
    queryKey: queryKeys.events.rsvps(eventId || ''),
    queryFn: () => fetchEventRsvps(eventId!),
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Mutation: Create event
export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({
      title,
      eventDate,
      location,
      address,
      description,
    }: {
      title: string;
      eventDate: string;
      location?: string;
      address?: string;
      description?: string;
    }) => {
      const groupId = currentGroup?.id;
      const userId = session?.user?.id;
      if (!groupId || !userId) throw new Error('No group or user');

      const { data, error } = await supabase
        .from('events')
        .insert({
          group_id: groupId,
          created_by: userId,
          title,
          event_date: eventDate,
          location: location || null,
          address: address || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      // Invalidate all event queries for this group
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Update event
export const useUpdateEventMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async ({
      eventId,
      title,
      eventDate,
      location,
      address,
      description,
    }: {
      eventId: string;
      title: string;
      eventDate: string;
      location?: string;
      address?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('events')
        .update({
          title,
          event_date: eventDate,
          location: location || null,
          address: address || null,
          description: description || null,
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Delete event
export const useDeleteEventMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async (eventId: string) => {
      // Delete RSVPs first
      await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', eventId);

      // Delete event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Upsert RSVP
export const useUpsertRsvpMutation = () => {
  const queryClient = useQueryClient();
  const { session } = useAppStore();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'going' | 'maybe' | 'not_going';
    }) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');

      const { data, error } = await supabase
        .from('event_rsvps')
        .upsert({
          event_id: eventId,
          user_id: userId,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ eventId, status }) => {
      // Cancel outgoing refetches for this event's RSVPs
      const queryKey = queryKeys.events.rsvps(eventId);
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousRsvps = queryClient.getQueryData(queryKey);

      // Optimistically update RSVPs
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        const userId = session?.user?.id;
        const existingIndex = old.findIndex((rsvp: RsvpWithProfile) => rsvp.user_id === userId);

        if (existingIndex >= 0) {
          // Update existing RSVP
          const updated = [...old];
          updated[existingIndex] = { ...updated[existingIndex], status };
          return updated;
        } else {
          // Add new RSVP (optimistic)
          return [
            ...old,
            {
              event_id: eventId,
              user_id: userId,
              status,
              created_at: new Date().toISOString(),
            },
          ];
        }
      });

      return { previousRsvps, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRsvps) {
        queryClient.setQueryData(context.queryKey, context.previousRsvps);
      }
    },
    onSettled: (_, __, { eventId }) => {
      // Refetch RSVPs for this event
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.rsvps(eventId),
      });
    },
  });
};
