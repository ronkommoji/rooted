/**
 * Profile API - shared fetch for user profile detail (used by ProfileScreen and background prefetch)
 */
import { supabase } from './supabase';
import type { Tables } from '../types/database';

export interface DevotionalWithEngagement extends Tables<'devotionals'> {
  profiles: Tables<'profiles'>;
  likes_count: number;
  comments_count: number;
}

export interface UserProfileData {
  profile: Tables<'profiles'>;
  isSameGroup: boolean;
  stats: {
    totalDevotionals: number;
    totalPrayers: number;
    currentStreak: number;
    contributionScore: number;
    totalLikes: number;
    totalComments: number;
  };
  devotionals: DevotionalWithEngagement[];
  prayers: Array<Tables<'prayers'> & { profiles: Tables<'profiles'> }>;
}

export async function fetchUserProfile(
  userId: string,
  currentGroupId: string,
  currentUserId: string
): Promise<UserProfileData | null> {
  // Phase 1: Fetch profile and group membership in parallel
  const [profileResult, groupCheckResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', currentGroupId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error('Profile not found');
  }

  if (groupCheckResult.error) {
    throw new Error('Failed to verify group membership');
  }

  const profile = profileResult.data as Tables<'profiles'>;
  const isSameGroup = !!groupCheckResult.data;

  if (!isSameGroup) {
    return {
      profile,
      isSameGroup: false,
      stats: {
        totalDevotionals: 0,
        totalPrayers: 0,
        currentStreak: 0,
        contributionScore: 0,
        totalLikes: 0,
        totalComments: 0,
      },
      devotionals: [],
      prayers: [],
    };
  }

  // Phase 2: Fetch all data in parallel
  const [devotionalsResult, prayersResult, streakResult, groupDevotionalIdsResult] = await Promise.all([
    supabase
      .from('devotionals')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .eq('group_id', currentGroupId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('prayers')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .eq('group_id', currentGroupId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .eq('group_id', currentGroupId)
      .maybeSingle(),
    supabase
      .from('devotionals')
      .select('id')
      .eq('group_id', currentGroupId),
  ]);

  const devotionals = devotionalsResult.data || [];
  const prayers = prayersResult.data || [];
  const currentStreak = streakResult.data?.current_streak || 0;
  const groupDevotionalIds = (groupDevotionalIdsResult.data || []).map((d: { id: string }) => d.id);
  const userDevotionalIds = devotionals.map((d: { id: string }) => d.id);

  let devotionalsWithEngagement: DevotionalWithEngagement[] = [];
  let totalLikes = 0;
  let totalCommentsReceived = 0;
  let commentsCount = 0;

  if (userDevotionalIds.length > 0 || groupDevotionalIds.length > 0) {
    const engagementQueries = [];

    if (userDevotionalIds.length > 0) {
      engagementQueries.push(
        supabase
          .from('devotional_likes')
          .select('devotional_id')
          .in('devotional_id', userDevotionalIds),
        supabase
          .from('devotional_comments')
          .select('devotional_id')
          .in('devotional_id', userDevotionalIds)
      );
    } else {
      engagementQueries.push(
        Promise.resolve({ data: [] }),
        Promise.resolve({ data: [] })
      );
    }

    if (groupDevotionalIds.length > 0) {
      engagementQueries.push(
        supabase
          .from('devotional_comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('devotional_id', groupDevotionalIds)
      );
    } else {
      engagementQueries.push(Promise.resolve({ count: 0 }));
    }

    const [likesResult, commentsResult, userCommentsResult] = await Promise.all(engagementQueries);

    const likesData = (likesResult as { data?: { devotional_id: string }[] }).data || [];
    const commentsData = (commentsResult as { data?: { devotional_id: string }[] }).data || [];
    commentsCount = (userCommentsResult as { count?: number }).count || 0;

    const likesMap = new Map<string, number>();
    likesData.forEach((like: { devotional_id: string }) => {
      likesMap.set(like.devotional_id, (likesMap.get(like.devotional_id) || 0) + 1);
    });

    const commentsMap = new Map<string, number>();
    commentsData.forEach((comment: { devotional_id: string }) => {
      commentsMap.set(comment.devotional_id, (commentsMap.get(comment.devotional_id) || 0) + 1);
    });

    devotionalsWithEngagement = devotionals.map((d: Record<string, unknown> & { id: string }) => ({
      ...d,
      likes_count: likesMap.get(d.id) || 0,
      comments_count: commentsMap.get(d.id) || 0,
    })) as DevotionalWithEngagement[];

    totalLikes = likesData.length;
    totalCommentsReceived = commentsData.length;
  } else {
    devotionalsWithEngagement = devotionals.map((d: Record<string, unknown>) => ({
      ...d,
      likes_count: 0,
      comments_count: 0,
    })) as DevotionalWithEngagement[];
  }

  const contributionScore = devotionals.length * 5 + prayers.length * 2 + commentsCount * 2;

  return {
    profile,
    isSameGroup: true,
    stats: {
      totalDevotionals: devotionals.length,
      totalPrayers: prayers.length,
      currentStreak,
      contributionScore,
      totalLikes,
      totalComments: totalCommentsReceived,
    },
    devotionals: devotionalsWithEngagement,
    prayers: prayers as UserProfileData['prayers'],
  };
}
