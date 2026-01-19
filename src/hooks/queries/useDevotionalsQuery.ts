import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase, supabaseUrl } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { Profile, Devotional } from '../../types/database';
import { validateImage, generateUniqueFilename } from '../../lib/fileValidation';
import { logger } from '../../lib/logger';

// Types
export interface DevotionalWithProfile extends Devotional {
  profiles: Profile;
  likes_count: number;
  user_liked: boolean;
}

interface DailyCompletion {
  user_id: string;
  scripture_completed: boolean;
  devotional_completed: boolean;
  prayer_completed: boolean;
}

// Fetch devotionals for a specific date
const fetchDevotionals = async (groupId: string, date: string, userId: string) => {
  const { data, error } = await supabase
    .from('devotionals')
    .select('*, profiles(*)')
    .eq('group_id', groupId)
    .eq('post_date', date)
    .not('image_url', 'is', null);

  if (error) throw error;
  return data || [];
};

// Fetch likes for devotionals
const fetchDevotionalLikes = async (devotionalIds: string[], userId: string) => {
  if (devotionalIds.length === 0) return [];

  const { data, error } = await supabase
    .from('devotional_likes')
    .select('devotional_id, user_id')
    .in('devotional_id', devotionalIds);

  if (error) throw error;
  return data || [];
};

// Fetch daily devotional completions
const fetchDailyCompletions = async (groupId: string, date: string) => {
  const { data, error } = await supabase
    .from('daily_devotional_completions')
    .select('user_id, scripture_completed, devotional_completed, prayer_completed')
    .eq('group_id', groupId)
    .eq('date', date);

  if (error) throw error;
  return data as DailyCompletion[];
};

// Fetch user streak
const fetchUserStreak = async (userId: string, groupId: string) => {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw error;
  return data?.current_streak || 0;
};

// Hook: Fetch devotionals with likes for a specific date
export const useDevotionalsQuery = (date: Date) => {
  const { currentGroup, session } = useAppStore();
  const groupId = currentGroup?.id;
  const userId = session?.user?.id;
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.devotionals.byDate(groupId || '', dateStr),
    queryFn: async () => {
      if (!groupId || !userId) return { devotionals: [], likes: [] };

      // Fetch devotionals and completions in parallel
      const [devotionalsData, completionsData] = await Promise.all([
        fetchDevotionals(groupId, dateStr, userId),
        fetchDailyCompletions(groupId, dateStr),
      ]);

      // Fetch likes if we have devotionals
      let likesData: any[] = [];
      if (devotionalsData.length > 0) {
        const devotionalIds = devotionalsData.map((d: any) => d.id);
        likesData = await fetchDevotionalLikes(devotionalIds, userId);
      }

      // Build likes map
      const likesCountMap = new Map<string, number>();
      const userLikesSet = new Set<string>();

      likesData.forEach((like: any) => {
        const count = likesCountMap.get(like.devotional_id) || 0;
        likesCountMap.set(like.devotional_id, count + 1);
        if (like.user_id === userId) {
          userLikesSet.add(like.devotional_id);
        }
      });

      // Combine devotionals with likes
      const devotionalsWithLikes = devotionalsData.map((devotional: any) => ({
        ...devotional,
        likes_count: likesCountMap.get(devotional.id) || 0,
        user_liked: userLikesSet.has(devotional.id),
      })) as DevotionalWithProfile[];

      return {
        devotionals: devotionalsWithLikes,
        likes: likesData,
        completions: completionsData,
      };
    },
    enabled: !!groupId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook: Fetch user streak
export const useUserStreakQuery = () => {
  const { currentGroup, session } = useAppStore();
  const groupId = currentGroup?.id;
  const userId = session?.user?.id;

  return useQuery({
    queryKey: queryKeys.streaks.current(userId || ''),
    queryFn: () => fetchUserStreak(userId!, groupId!),
    enabled: !!groupId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook: Fetch daily completions with comments
export const useDailyCompletionsQuery = (date: Date) => {
  const { currentGroup } = useAppStore();
  const groupId = currentGroup?.id;
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.devotionals.completions(groupId || '', dateStr),
    queryFn: async () => {
      if (!groupId) return { completions: [], completionsMap: new Map() };

      const completions = await fetchDailyCompletions(groupId, dateStr);

      // Get users who completed all 3 items
      const completedUserIds = completions
        .filter((c) => c.scripture_completed && c.devotional_completed && c.prayer_completed)
        .map((c) => c.user_id);

      if (completedUserIds.length === 0) {
        return { completions: [], completionsMap: new Map() };
      }

      // Find devotional entries that might have comments
      const { data: devotionalEntries } = await supabase
        .from('devotionals')
        .select('id, user_id, content')
        .eq('group_id', groupId)
        .eq('post_date', dateStr)
        .in('user_id', completedUserIds)
        .or('content.ilike.%Daily Devotional%');

      // For each user, check if they have a comment
      const completionsMap = new Map();
      for (const userId of completedUserIds) {
        const entry = devotionalEntries?.find((e: any) => e.user_id === userId);
        if (entry) {
          const { data: comments } = await supabase
            .from('devotional_comments')
            .select('id, content')
            .eq('devotional_id', entry.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (comments && comments.length > 0) {
            completionsMap.set(userId, {
              hasComment: true,
              commentText: comments[0].content,
              commentId: comments[0].id,
            });
          } else {
            completionsMap.set(userId, { hasComment: false });
          }
        } else {
          completionsMap.set(userId, { hasComment: false });
        }
      }

      return {
        completions: completedUserIds,
        completionsMap,
      };
    },
    enabled: !!groupId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Mutation: Add/Update devotional
export const useAddDevotionalMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({ imageUrl, date }: { imageUrl: string; date: string }) => {
      const groupId = currentGroup?.id;
      const userId = session?.user?.id;
      if (!groupId || !userId) throw new Error('No group or user');

      // Check if already posted
      const { data: existing } = await supabase
        .from('devotionals')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('post_date', date)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('devotionals')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*, profiles(*)')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('devotionals')
          .insert({
            group_id: groupId,
            user_id: userId,
            image_url: imageUrl,
            post_date: date,
          })
          .select('*, profiles(*)')
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { date }) => {
      // Invalidate devotionals cache for this date
      queryClient.invalidateQueries({
        queryKey: queryKeys.devotionals.byDate(currentGroup?.id || '', date),
      });
      // Also invalidate streak
      queryClient.invalidateQueries({
        queryKey: queryKeys.streaks.current(session?.user?.id || ''),
      });
    },
  });
};

// Mutation: Delete devotional
export const useDeleteDevotionalMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({ devotionalId, imageUrl, date }: { devotionalId: string; imageUrl: string | null; date: string }) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');

      // Delete likes first
      await supabase
        .from('devotional_likes')
        .delete()
        .eq('devotional_id', devotionalId);

      // Delete devotional
      const { error } = await supabase
        .from('devotionals')
        .delete()
        .eq('id', devotionalId);

      if (error) throw error;

      // Try to delete storage file
      if (imageUrl) {
        try {
          const urlParts = imageUrl.split('/devotionals/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('devotionals').remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
        }
      }
    },
    onSuccess: (_, { date }) => {
      // Invalidate devotionals cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.devotionals.byDate(currentGroup?.id || '', date),
      });
    },
  });
};

// Mutation: Toggle like
export const useToggleLikeMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async ({ devotionalId, isLiked, date }: { devotionalId: string; isLiked: boolean; date: string }) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');

      if (isLiked) {
        // Remove like
        await supabase
          .from('devotional_likes')
          .delete()
          .eq('devotional_id', devotionalId)
          .eq('user_id', userId);
      } else {
        // Add like
        await supabase
          .from('devotional_likes')
          .insert({
            devotional_id: devotionalId,
            user_id: userId,
          });
      }

      return { devotionalId, isLiked: !isLiked };
    },
    onMutate: async ({ devotionalId, isLiked, date }) => {
      // Cancel outgoing refetches
      const queryKey = queryKeys.devotionals.byDate(currentGroup?.id || '', date);
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          devotionals: old.devotionals.map((d: DevotionalWithProfile) =>
            d.id === devotionalId
              ? {
                  ...d,
                  likes_count: isLiked ? d.likes_count - 1 : d.likes_count + 1,
                  user_liked: !isLiked,
                }
              : d
          ),
        };
      });

      return { previousData, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_, __, { date }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.devotionals.byDate(currentGroup?.id || '', date),
      });
    },
  });
};

// Mutation: Update streak
export const useUpdateStreakMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup, session } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      const groupId = currentGroup?.id;
      const userId = session?.user?.id;
      if (!groupId || !userId) throw new Error('No group or user');

      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      // Get current streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .maybeSingle();

      let newStreak = 1;
      let longestStreak = 1;

      if (streakData) {
        const lastPostDate = streakData.last_post_date;

        if (lastPostDate === today) {
          return streakData.current_streak; // Already posted today
        } else if (lastPostDate === yesterday) {
          newStreak = (streakData.current_streak || 0) + 1;
        } else {
          newStreak = 1;
        }

        longestStreak = Math.max(newStreak, streakData.longest_streak || 0);

        await supabase
          .from('user_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_post_date: today,
          })
          .eq('id', streakData.id);
      } else {
        // Create new streak
        await supabase
          .from('user_streaks')
          .insert({
            user_id: userId,
            group_id: groupId,
            current_streak: 1,
            longest_streak: 1,
            last_post_date: today,
          });
      }

      return newStreak;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.streaks.current(session?.user?.id || ''),
      });
    },
  });
};

// Upload image helper
export const uploadDevotionalImage = async (imageUri: string, userId: string): Promise<string | null> => {
  try {
    // Validate image
    const validation = await validateImage(imageUri, {
      maxSize: 5 * 1024 * 1024, // 5MB
      maxWidth: 4000,
      maxHeight: 4000,
    });

    if (!validation.valid) {
      logger.error('Image validation failed', undefined, {
        error: validation.error,
        userId,
      });
      throw new Error(validation.error || 'Invalid image');
    }

    logger.info('Image validated successfully', {
      fileSize: validation.fileSize,
      mimeType: validation.mimeType,
      userId,
    });

    // Create file name
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = generateUniqueFilename(`devotional.${fileExt}`, userId);
    const filePathWithFolder = `${userId}/${fileName}`;

    // Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: validation.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
    } as any);

    // Upload
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const startTime = Date.now();
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/devotionals/${filePathWithFolder}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-upsert': 'false',
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('Failed to upload image', undefined, {
        status: uploadResponse.status,
        error: errorText,
        userId,
      });
      return null;
    }

    const uploadDuration = Date.now() - startTime;
    logger.info('Image uploaded successfully', {
      duration: `${uploadDuration}ms`,
      userId,
      fileSize: validation.fileSize,
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('devotionals')
      .getPublicUrl(filePathWithFolder);

    return urlData.publicUrl;
  } catch (error) {
    logger.error('Error in uploadImage', error as Error, { userId });
    return null;
  }
};
