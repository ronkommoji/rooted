import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { fetchTodayDevotional } from '../../lib/devotionalApi';

interface DailyDevotionalContent {
  title: string;
  scripture: string;
  devotional: string;
  prayer: string;
  image_url: string | null;
}

interface DailyDevotionalCompletion {
  user_id: string;
  group_id: string;
  date: string;
  scripture_completed: boolean;
  devotional_completed: boolean;
  prayer_completed: boolean;
}

// Fetch daily devotional content (external API)
const fetchDailyDevotionalContent = async (date: string): Promise<DailyDevotionalContent> => {
  const devotional = await fetchTodayDevotional();
  return devotional;
};

// Fetch user's completion status for a specific date
const fetchCompletionStatus = async (userId: string, groupId: string, date: string) => {
  const { data, error } = await supabase
    .from('daily_devotional_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data as DailyDevotionalCompletion | null;
};

// Hook: Fetch daily devotional content
export const useDailyDevotionalContentQuery = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.dailyDevotional.byDate(dateStr),
    queryFn: () => fetchDailyDevotionalContent(dateStr),
    enabled: dateStr === today, // Only fetch for today
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook: Fetch completion status
export const useCompletionStatusQuery = (date: Date) => {
  const { currentGroup, session } = useAppStore();
  const groupId = currentGroup?.id;
  const userId = session?.user?.id;
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.dailyDevotional.completion(userId || '', dateStr),
    queryFn: () => fetchCompletionStatus(userId!, groupId!, dateStr),
    enabled: !!userId && !!groupId,
    staleTime: 30 * 1000, // 30 seconds - matches current cache
  });
};

// Mutation: Update completion (mark scripture/devotional/prayer as complete)
export const useUpdateCompletionMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({
      date,
      field,
      value,
    }: {
      date: string;
      field: 'scripture_completed' | 'devotional_completed' | 'prayer_completed';
      value: boolean;
    }) => {
      const groupId = currentGroup?.id;
      const userId = session?.user?.id;
      if (!groupId || !userId) throw new Error('No group or user');

      // Upsert completion record
      const { data, error } = await supabase
        .from('daily_devotional_completions')
        .upsert({
          user_id: userId,
          group_id: groupId,
          date,
          [field]: value,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DailyDevotionalCompletion;
    },
    onMutate: async ({ date, field, value }) => {
      const userId = session?.user?.id;
      const queryKey = queryKeys.dailyDevotional.completion(userId || '', date);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousCompletion = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) {
          return {
            user_id: userId,
            group_id: currentGroup?.id,
            date,
            scripture_completed: field === 'scripture_completed' ? value : false,
            devotional_completed: field === 'devotional_completed' ? value : false,
            prayer_completed: field === 'prayer_completed' ? value : false,
          };
        }
        return { ...old, [field]: value };
      });

      return { previousCompletion, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCompletion !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousCompletion);
      }
    },
    onSuccess: (_, { date }) => {
      const userId = session?.user?.id;
      // Invalidate completion status
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailyDevotional.completion(userId || '', date),
      });
      // Also invalidate devotionals completions (for story display)
      queryClient.invalidateQueries({
        queryKey: queryKeys.devotionals.completions(currentGroup?.id || '', date),
      });
    },
  });
};

// Helper mutations for marking individual items complete
export const useMarkScriptureCompleteMutation = () => {
  const mutation = useUpdateCompletionMutation();

  return {
    ...mutation,
    mutate: (date: string) =>
      mutation.mutate({ date, field: 'scripture_completed', value: true }),
    mutateAsync: (date: string) =>
      mutation.mutateAsync({ date, field: 'scripture_completed', value: true }),
  };
};

export const useMarkDevotionalCompleteMutation = () => {
  const mutation = useUpdateCompletionMutation();

  return {
    ...mutation,
    mutate: (date: string) =>
      mutation.mutate({ date, field: 'devotional_completed', value: true }),
    mutateAsync: (date: string) =>
      mutation.mutateAsync({ date, field: 'devotional_completed', value: true }),
  };
};

export const useMarkPrayerCompleteMutation = () => {
  const mutation = useUpdateCompletionMutation();

  return {
    ...mutation,
    mutate: (date: string) =>
      mutation.mutate({ date, field: 'prayer_completed', value: true }),
    mutateAsync: (date: string) =>
      mutation.mutateAsync({ date, field: 'prayer_completed', value: true }),
  };
};
