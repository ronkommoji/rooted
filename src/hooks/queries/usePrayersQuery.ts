import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { Tables } from '../../types/database';

type Prayer = Tables<'prayers'>;

export interface PrayerWithAuthor extends Prayer {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Fetch prayers for a group with optional filter
const fetchPrayers = async (groupId: string, filter: boolean | 'all' = 'all') => {
  let query = supabase
    .from('prayers')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (filter !== 'all') {
    query = query.eq('is_answered', filter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as PrayerWithAuthor[];
};

// Fetch recent prayers (limited count)
const fetchRecentPrayers = async (groupId: string, limit: number = 3) => {
  const { data, error } = await supabase
    .from('prayers')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('group_id', groupId)
    .eq('is_answered', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as PrayerWithAuthor[];
};

// Hook: Fetch all prayers with filter
export const usePrayersQuery = (filter: boolean | 'all' = 'all') => {
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;

  return useQuery({
    queryKey: queryKeys.prayers.filtered(groupId || '', filter),
    queryFn: () => fetchPrayers(groupId!, filter),
    enabled: !!groupId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook: Fetch recent prayers (for home screen)
export const useRecentPrayersQuery = (limit: number = 3) => {
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;

  return useQuery({
    queryKey: queryKeys.prayers.recent(groupId || '', limit),
    queryFn: () => fetchRecentPrayers(groupId!, limit),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches home screen cache
  });
};

// Mutation: Create prayer
export const useCreatePrayerMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content?: string }) => {
      const groupId = currentGroup?.id;
      const userId = session?.user?.id;
      if (!groupId || !userId) throw new Error('No group or user');

      const { data, error } = await supabase
        .from('prayers')
        .insert({
          group_id: groupId,
          user_id: userId,
          title,
          content: content || null,
          is_answered: false,
          prayer_count: 0,
        })
        .select('*, profiles(id, full_name, avatar_url)')
        .single();

      if (error) throw error;
      return data as PrayerWithAuthor;
    },
    onSuccess: () => {
      // Invalidate all prayer queries for this group
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Update prayer
export const useUpdatePrayerMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async ({ prayerId, title, content }: { prayerId: string; title: string; content?: string }) => {
      const { data, error } = await supabase
        .from('prayers')
        .update({
          title,
          content: content || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prayerId)
        .select('*, profiles(id, full_name, avatar_url)')
        .single();

      if (error) throw error;
      return data as PrayerWithAuthor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Delete prayer
export const useDeletePrayerMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async (prayerId: string) => {
      const { error } = await supabase
        .from('prayers')
        .delete()
        .eq('id', prayerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Mark prayer as answered
export const useMarkPrayerAnsweredMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async (prayerId: string) => {
      const { data, error } = await supabase
        .from('prayers')
        .update({ is_answered: true })
        .eq('id', prayerId)
        .select('*, profiles(id, full_name, avatar_url)')
        .single();

      if (error) throw error;
      return data as PrayerWithAuthor;
    },
    onMutate: async (prayerId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });

      // Snapshot previous values
      const previousPrayers = queryClient.getQueriesData({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });

      // Optimistically update - remove from unanswered, add to answered
      queryClient.setQueriesData(
        { queryKey: queryKeys.prayers.byGroup(currentGroup?.id || '') },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((prayer: PrayerWithAuthor) =>
            prayer.id === prayerId ? { ...prayer, is_answered: true } : prayer
          );
        }
      );

      return { previousPrayers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPrayers) {
        context.previousPrayers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch all prayer queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });
    },
  });
};

// Mutation: Increment prayer count (prayed for this request)
export const useIncrementPrayerCountMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async (prayerId: string) => {
      // Use RPC function for atomic increment
      const { data, error } = await supabase.rpc('increment_prayer_count', {
        prayer_id: prayerId,
      });

      if (error) throw error;
      return data;
    },
    onMutate: async (prayerId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });

      // Snapshot previous values
      const previousPrayers = queryClient.getQueriesData({
        queryKey: queryKeys.prayers.byGroup(currentGroup?.id || ''),
      });

      // Optimistically increment count
      queryClient.setQueriesData(
        { queryKey: queryKeys.prayers.byGroup(currentGroup?.id || '') },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((prayer: PrayerWithAuthor) =>
            prayer.id === prayerId
              ? { ...prayer, prayer_count: (prayer.prayer_count || 0) + 1 }
              : prayer
          );
        }
      );

      return { previousPrayers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPrayers) {
        context.previousPrayers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
};
