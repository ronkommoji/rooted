import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { supabase, supabaseUrl } from '../../../lib/supabase';
import { useAppStore } from '../../../store/useAppStore';
import { Profile, Devotional, GroupMemberWithProfile } from '../../../types/database';
import { MemberSubmission } from '../components/StoryRow';

// Types
export interface DevotionalWithProfile extends Devotional {
  profiles: Profile;
  likes_count: number;
  user_liked: boolean;
}

interface UseDevotionalsReturn {
  // Data
  memberSubmissions: MemberSubmission[];
  feedSubmissions: MemberSubmission[];
  currentUserHasPosted: boolean;
  completedCount: number;
  totalMembers: number;
  currentUserStreak: number;
  
  // State
  loading: boolean;
  refreshing: boolean;
  
  // Actions
  fetchDevotionals: () => Promise<void>;
  onRefresh: () => Promise<void>;
  addDevotional: (imageUrl: string) => Promise<void>;
  deleteDevotional: (devotionalId: string) => Promise<void>;
  toggleLike: (devotionalId: string) => Promise<void>;
  uploadImage: (imageUri: string) => Promise<string | null>;
}

export const useDevotionals = (selectedDate: Date): UseDevotionalsReturn => {
  const { currentGroup, session, groupMembers, fetchGroupMembers, profile } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devotionals, setDevotionals] = useState<DevotionalWithProfile[]>([]);
  const [userStreak, setUserStreak] = useState(0);
  const [likedDevotionalIds, setLikedDevotionalIds] = useState<Set<string>>(new Set());

  const selectedDateISO = format(selectedDate, 'yyyy-MM-dd');
  const currentUserId = session?.user?.id;

  // Fetch devotionals for the selected date
  const fetchDevotionals = useCallback(async () => {
    if (!currentGroup?.id || !currentUserId) {
      setLoading(false);
      return;
    }

    try {
      // Ensure we have group members
      if (groupMembers.length === 0) {
        await fetchGroupMembers();
      }

      // Fetch devotionals for selected date
      const { data: devotionalsData, error } = await supabase
        .from('devotionals')
        .select('*, profiles(*)')
        .eq('group_id', currentGroup.id)
        .eq('post_date', selectedDateISO);

      if (error) {
        console.error('Error fetching devotionals:', error);
        return;
      }

      // Fetch likes for each devotional
      const devotionalsWithLikes = await Promise.all(
        (devotionalsData || []).map(async (devotional) => {
          // Get likes count
          const { count: likesCount } = await supabase
            .from('devotional_likes')
            .select('*', { count: 'exact', head: true })
            .eq('devotional_id', devotional.id);

          // Check if current user liked
          const { data: userLike } = await supabase
            .from('devotional_likes')
            .select('id')
            .eq('devotional_id', devotional.id)
            .eq('user_id', currentUserId)
            .single();

          return {
            ...devotional,
            likes_count: likesCount || 0,
            user_liked: !!userLike,
          } as DevotionalWithProfile;
        })
      );

      setDevotionals(devotionalsWithLikes);

      // Update liked devotional IDs
      const likedIds = new Set(
        devotionalsWithLikes
          .filter((d) => d.user_liked)
          .map((d) => d.id)
      );
      setLikedDevotionalIds(likedIds);

      // Fetch user streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', currentUserId)
        .eq('group_id', currentGroup.id)
        .single();

      setUserStreak(streakData?.current_streak || 0);
    } catch (error) {
      console.error('Error in fetchDevotionals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentGroup?.id, currentUserId, selectedDateISO, groupMembers.length, fetchGroupMembers]);

  // Initial fetch
  useEffect(() => {
    fetchDevotionals();
  }, [fetchDevotionals]);

  // Build member submissions
  const memberSubmissions: MemberSubmission[] = useMemo(() => {
    return groupMembers.map((member) => {
      const devotional = devotionals.find((d) => d.user_id === member.user_id);
      return {
        memberId: member.user_id,
        memberName: member.profiles?.full_name || 'Unknown',
        imageUrl: devotional?.image_url || null,
        hasPosted: !!devotional,
        createdAt: devotional?.created_at || null,
        likes: devotional?.likes_count || 0,
        devotionalId: devotional?.id,
      };
    });
  }, [groupMembers, devotionals]);

  // Feed submissions (only those who posted, sorted by most recent)
  const feedSubmissions = useMemo(() => {
    return memberSubmissions
      .filter((m) => m.hasPosted)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [memberSubmissions]);

  // Check if current user has posted
  const currentUserHasPosted = useMemo(() => {
    return devotionals.some((d) => d.user_id === currentUserId);
  }, [devotionals, currentUserId]);

  // Progress counts
  const completedCount = feedSubmissions.length;
  const totalMembers = groupMembers.length;

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevotionals();
    setRefreshing(false);
  }, [fetchDevotionals]);

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (imageUri: string): Promise<string | null> => {
    if (!currentUserId) return null;

    try {
      // Create file name with user ID and timestamp
      const timestamp = Date.now();
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${currentUserId}/${timestamp}.${fileExt}`;

      // For React Native, we need to create a FormData and use the file URI directly
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: `${timestamp}.${fileExt}`,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      // Upload to Supabase Storage using fetch with FormData
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/devotionals/${fileName}`,
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
        console.error('Error uploading image:', errorText);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('devotionals')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    }
  }, [currentUserId]);

  // Add devotional
  const addDevotional = useCallback(async (imageUrl: string) => {
    if (!currentGroup?.id || !currentUserId) return;

    try {
      // Check if already posted today
      const { data: existing } = await supabase
        .from('devotionals')
        .select('id')
        .eq('group_id', currentGroup.id)
        .eq('user_id', currentUserId)
        .eq('post_date', selectedDateISO)
        .single();

      if (existing) {
        // Update existing devotional
        await supabase
          .from('devotionals')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new devotional
        await supabase
          .from('devotionals')
          .insert({
            group_id: currentGroup.id,
            user_id: currentUserId,
            image_url: imageUrl,
            post_date: selectedDateISO,
          });

        // Update streak
        await updateStreak();
      }

      // Refresh data
      await fetchDevotionals();
    } catch (error) {
      console.error('Error adding devotional:', error);
      throw error;
    }
  }, [currentGroup?.id, currentUserId, selectedDateISO, fetchDevotionals]);

  // Update user streak
  const updateStreak = useCallback(async () => {
    if (!currentGroup?.id || !currentUserId) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Get current streak data
    const { data: streakData } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('group_id', currentGroup.id)
      .single();

    let newStreak = 1;
    let longestStreak = 1;

    if (streakData) {
      const lastPostDate = streakData.last_post_date;
      
      if (lastPostDate === today) {
        // Already posted today, no change
        return;
      } else if (lastPostDate === yesterday) {
        // Consecutive day, increment streak
        newStreak = (streakData.current_streak || 0) + 1;
      } else {
        // Streak broken, reset to 1
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
      // Create new streak record
      await supabase
        .from('user_streaks')
        .insert({
          user_id: currentUserId,
          group_id: currentGroup.id,
          current_streak: 1,
          longest_streak: 1,
          last_post_date: today,
        });
    }

    setUserStreak(newStreak);
  }, [currentGroup?.id, currentUserId]);

  // Delete devotional
  const deleteDevotional = useCallback(async (devotionalId: string) => {
    if (!currentUserId) return;

    try {
      // Get the devotional to find the image URL
      const devotional = devotionals.find((d) => d.id === devotionalId);
      
      if (!devotional) {
        console.error('Devotional not found');
        return;
      }

      // Only allow user to delete their own devotional
      if (devotional.user_id !== currentUserId) {
        console.error('Cannot delete another user\'s devotional');
        return;
      }

      // Delete likes first (foreign key constraint)
      await supabase
        .from('devotional_likes')
        .delete()
        .eq('devotional_id', devotionalId);

      // Delete the devotional record
      const { error } = await supabase
        .from('devotionals')
        .delete()
        .eq('id', devotionalId);

      if (error) {
        console.error('Error deleting devotional:', error);
        return;
      }

      // Try to delete the image from storage (optional, don't fail if this fails)
      if (devotional.image_url) {
        try {
          // Extract the path from the URL
          const urlParts = devotional.image_url.split('/devotionals/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('devotionals').remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
        }
      }

      // Refresh data
      await fetchDevotionals();
    } catch (error) {
      console.error('Error in deleteDevotional:', error);
      throw error;
    }
  }, [currentUserId, devotionals, fetchDevotionals]);

  // Toggle like on devotional
  const toggleLike = useCallback(async (devotionalId: string) => {
    if (!currentUserId) return;

    const isLiked = likedDevotionalIds.has(devotionalId);

    // Optimistic update
    setLikedDevotionalIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(devotionalId);
      } else {
        next.add(devotionalId);
      }
      return next;
    });

    setDevotionals((prev) =>
      prev.map((d) =>
        d.id === devotionalId
          ? {
              ...d,
              likes_count: isLiked ? d.likes_count - 1 : d.likes_count + 1,
              user_liked: !isLiked,
            }
          : d
      )
    );

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('devotional_likes')
          .delete()
          .eq('devotional_id', devotionalId)
          .eq('user_id', currentUserId);
      } else {
        // Add like
        await supabase
          .from('devotional_likes')
          .insert({
            devotional_id: devotionalId,
            user_id: currentUserId,
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      await fetchDevotionals();
    }
  }, [currentUserId, likedDevotionalIds, fetchDevotionals]);

  return {
    memberSubmissions,
    feedSubmissions,
    currentUserHasPosted,
    completedCount,
    totalMembers,
    currentUserStreak: userStreak,
    loading,
    refreshing,
    fetchDevotionals,
    onRefresh,
    addDevotional,
    deleteDevotional,
    toggleLike,
    uploadImage,
  };
};

