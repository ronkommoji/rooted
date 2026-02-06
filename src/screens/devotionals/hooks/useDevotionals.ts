import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { supabase, supabaseUrl } from '../../../lib/supabase';
import { useAppStore } from '../../../store/useAppStore';
import { Profile, Devotional, GroupMemberWithProfile } from '../../../types/database';
import { MemberSubmission, StorySlide } from '../components/StoryRow';
import { fetchDevotionalByDate } from '../../../lib/devotionalApi';
import { validateImage, generateUniqueFilename } from '../../../lib/fileValidation';
import { logger } from '../../../lib/logger';
import { subscribeDailyDevotionalCompletion } from '../../../lib/dailyDevotionalEvents';

// Cache duration: 2 minutes for devotionals data
const DEVOTIONALS_CACHE_DURATION_MS = 2 * 60 * 1000;

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
  storySlides: StorySlide[];
  currentUserHasPosted: boolean;
  currentUserCompletedDaily: boolean;
  currentUserHasImagePost: boolean;
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
  addDailyDevotional: () => Promise<void>; // For completing daily devotional (all 3 items)
  deleteDevotional: (devotionalId: string) => Promise<void>;
  toggleLike: (devotionalId: string) => Promise<void>;
  uploadImage: (imageUri: string) => Promise<string | null>;
}

export const useDevotionals = (selectedDate: Date): UseDevotionalsReturn => {
  const { currentGroup, session, groupMembers, fetchGroupMembers, profile } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [devotionals, setDevotionals] = useState<DevotionalWithProfile[]>([]);
  const [userStreak, setUserStreak] = useState(0);
  const [likedDevotionalIds, setLikedDevotionalIds] = useState<Set<string>>(new Set());
  const [dailyDevotionalImageUrl, setDailyDevotionalImageUrl] = useState<string | null>(null);

  // Cache tracking - track last fetch time per date
  const lastFetchTime = useRef<Record<string, number>>({});
  const cachedData = useRef<Record<string, {
    devotionals: DevotionalWithProfile[];
    userStreak: number;
    likedDevotionalIds: Set<string>;
  }>>({});

  const selectedDateISO = format(selectedDate, 'yyyy-MM-dd');
  const currentUserId = session?.user?.id;

  // Fetch daily devotional image for selected date
  useEffect(() => {
    const fetchDailyDevotionalImage = async () => {
      try {
        const devotional = await fetchDevotionalByDate(selectedDateISO);
        setDailyDevotionalImageUrl(devotional?.image_url || null);
      } catch (error) {
        console.error('Error fetching daily devotional image:', error);
        setDailyDevotionalImageUrl(null);
      }
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    const isFutureDay = isAfter(parseISO(selectedDateISO), parseISO(today));
    if (isFutureDay) {
      setDailyDevotionalImageUrl(null);
      return;
    }

    fetchDailyDevotionalImage();
  }, [selectedDateISO]);

  // Fetch devotionals for the selected date
  const fetchDevotionals = useCallback(async (forceRefresh = false) => {
    if (!currentGroup?.id || !currentUserId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const now = Date.now();
    const lastFetch = lastFetchTime.current[selectedDateISO] || 0;
    const isStale = (now - lastFetch) > DEVOTIONALS_CACHE_DURATION_MS;
    
    // If we have cached data and it's not stale, use it
    if (!forceRefresh && !isStale && cachedData.current[selectedDateISO]) {
      const cached = cachedData.current[selectedDateISO];
      setDevotionals(cached.devotionals);
      setUserStreak(cached.userStreak);
      setLikedDevotionalIds(cached.likedDevotionalIds);
      setLoading(false);
      return;
    }

    try {
      // Fetch group members, devotionals, daily devotional completions, and streak in parallel
      const [groupMembersResult, devotionalsResult, dailyCompletionsResult, streakResult] = await Promise.all([
        // Fetch group members if needed
        groupMembers.length === 0 ? fetchGroupMembers() : Promise.resolve(),
        
        // Fetch devotionals for selected date (only those with images)
        supabase
          .from('devotionals')
          .select('*, profiles(*)')
          .eq('group_id', currentGroup.id)
          .eq('post_date', selectedDateISO)
          .not('image_url', 'is', null),
        
        // Fetch daily devotional completions for selected date
        supabase
          .from('daily_devotional_completions')
          .select('user_id, scripture_completed, devotional_completed, prayer_completed')
          .eq('group_id', currentGroup.id)
          .eq('date', selectedDateISO),
        
        // Fetch user streak
        supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', currentUserId)
          .eq('group_id', currentGroup.id)
          .single(),
      ]);

      const { data: devotionalsData, error } = devotionalsResult as { data: any; error: any };
      const { data: dailyCompletionsData } = dailyCompletionsResult as { data: any; error: any };

      if (error) {
        console.error('Error fetching devotionals:', error);
        setLoading(false);
        return;
      }

      // Store daily completions for later use (we'll fetch comments separately)
      // Just mark that these users completed daily devotional
      const dailyCompletionsUserIds = new Set<string>();
      (dailyCompletionsData || []).forEach((completion: any) => {
        if (completion.scripture_completed && completion.devotional_completed && completion.prayer_completed) {
          dailyCompletionsUserIds.add(completion.user_id);
        }
      });

      // Early return if no devotionals and no daily completions
      if ((!devotionalsData || devotionalsData.length === 0) && dailyCompletionsUserIds.size === 0) {
        setDevotionals([]);
        setLikedDevotionalIds(new Set());
        const streakData = streakResult as { data: any };
        setUserStreak(streakData?.data?.current_streak || 0);
        setLoading(false);
        return;
      }

      // Get all devotional IDs (only if we have devotionals)
      const devotionalIds = (devotionalsData || []).map((d: any) => d.id);

      // Fetch all likes in a single query (only if we have devotionals)
      let allLikes: any[] = [];
      if (devotionalIds.length > 0) {
        const { data: likesData, error: likesError } = await supabase
          .from('devotional_likes')
          .select('devotional_id, user_id')
          .in('devotional_id', devotionalIds);
        
        if (likesError) {
          console.error('Error fetching likes:', likesError);
        } else {
          allLikes = likesData || [];
        }
      }

      // Build a map of likes count and user likes
      const likesCountMap = new Map<string, number>();
      const userLikesSet = new Set<string>();

      allLikes.forEach((like: any) => {
        const count = likesCountMap.get(like.devotional_id) || 0;
        likesCountMap.set(like.devotional_id, count + 1);
        
        if (like.user_id === currentUserId) {
          userLikesSet.add(like.devotional_id);
        }
      });

      // Combine devotionals with likes data
      const devotionalsWithLikes = devotionalsData.map((devotional: any) => ({
        ...devotional,
        likes_count: likesCountMap.get(devotional.id) || 0,
        user_liked: userLikesSet.has(devotional.id),
      })) as DevotionalWithProfile[];

      setDevotionals(devotionalsWithLikes);
      setLikedDevotionalIds(userLikesSet);

      // Set streak
      const streakData = streakResult as { data: any };
      const streak = streakData?.data?.current_streak || 0;
      setUserStreak(streak);

      // Cache the data
      lastFetchTime.current[selectedDateISO] = now;
      cachedData.current[selectedDateISO] = {
        devotionals: devotionalsWithLikes,
        userStreak: streak,
        likedDevotionalIds: userLikesSet,
      };
    } catch (error) {
      console.error('Error in fetchDevotionals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentGroup?.id, currentUserId, selectedDateISO, groupMembers.length, fetchGroupMembers]);

  // Initial fetch - check cache first before setting loading
  useEffect(() => {
    // Check cache first
    const now = Date.now();
    const lastFetch = lastFetchTime.current[selectedDateISO] || 0;
    const isStale = (now - lastFetch) > DEVOTIONALS_CACHE_DURATION_MS;
    
    // If we have cached data and it's not stale, use it immediately
    if (!isStale && cachedData.current[selectedDateISO]) {
      const cached = cachedData.current[selectedDateISO];
      setDevotionals(cached.devotionals);
      setUserStreak(cached.userStreak);
      setLikedDevotionalIds(cached.likedDevotionalIds);
      setLoading(false);
      // Still fetch in background to ensure data is fresh
      fetchDevotionals(false);
      return;
    }
    
    // No cache or stale - fetch with loading
    setLoading(true);
    fetchDevotionals(false);
  }, [fetchDevotionals, selectedDateISO]);

  useEffect(() => {
    if (!currentGroup?.id) return;
    const unsubscribe = subscribeDailyDevotionalCompletion((event) => {
      if (event.groupId !== currentGroup.id) return;
      if (event.date !== selectedDateISO) return;
      if (!event.allCompleted) return;
      fetchDailyCompletions();
      fetchDevotionals(true);
    });

    return unsubscribe;
  }, [currentGroup?.id, selectedDateISO, fetchDevotionals, fetchDailyCompletions]);

  // Store daily devotional completions with comments
  // Map structure: userId -> { hasComment: boolean, commentText?: string, commentId?: string }
  const [dailyCompletions, setDailyCompletions] = useState<Map<string, { hasComment: boolean; commentText?: string; commentId?: string }>>(new Map());
  
  // Store which users completed daily devotional (all 3 items) - separate from comments
  const [dailyCompletionUserIds, setDailyCompletionUserIds] = useState<Set<string>>(new Set());

  // Fetch daily devotional completions and comments
  const fetchDailyCompletions = useCallback(async () => {
    if (!currentGroup?.id || !selectedDateISO) {
      setDailyCompletions(new Map());
      setDailyCompletionUserIds(new Set());
      return;
    }

    try {
      // Fetch daily devotional completions
      const { data: completions } = await supabase
        .from('daily_devotional_completions')
        .select('user_id, scripture_completed, devotional_completed, prayer_completed')
        .eq('group_id', currentGroup.id)
        .eq('date', selectedDateISO);

      if (!completions || completions.length === 0) {
        setDailyCompletions(new Map());
        setDailyCompletionUserIds(new Set());
        return;
      }

      // Get all users who completed daily devotional (all 3 items)
      const completedUserIds = completions
        .filter((c: any) => c.scripture_completed && c.devotional_completed && c.prayer_completed)
        .map((c: any) => c.user_id);

      setDailyCompletionUserIds(new Set(completedUserIds));

      if (completedUserIds.length === 0) {
        setDailyCompletions(new Map());
        return;
      }

      // Find devotional entries that might have comments (created by DevotionalDetailScreen)
      const { data: devotionalEntries } = await supabase
        .from('devotionals')
        .select('id, user_id, content')
        .eq('group_id', currentGroup.id)
        .eq('post_date', selectedDateISO)
        .in('user_id', completedUserIds)
        .or('content.ilike.%Daily Devotional%');

      // For each user, check if they have a comment
      const completionsMap = new Map();
      for (const userId of completedUserIds) {
        const entry = devotionalEntries?.find((e: any) => e.user_id === userId);
        if (entry) {
          // Check for comments
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

      setDailyCompletions(completionsMap);
    } catch (error) {
      console.error('Error fetching daily completions:', error);
      setDailyCompletions(new Map());
      setDailyCompletionUserIds(new Set());
    }
  }, [currentGroup?.id, selectedDateISO]);

  useEffect(() => {
    fetchDailyCompletions();
  }, [fetchDailyCompletions]);

  // Build member submissions
  const memberSubmissions: MemberSubmission[] = useMemo(() => {
    return groupMembers.map((member) => {
      const devotional = devotionals.find((d) => d.user_id === member.user_id);
      const hasCompletedDaily = dailyCompletionUserIds.has(member.user_id);
      const dailyCompletion = dailyCompletions.get(member.user_id);
      
      // hasPosted is true if they have an image devotional OR completed daily devotional
      const hasPosted = !!devotional || hasCompletedDaily;

      return {
        memberId: member.user_id,
        memberName: member.profiles?.full_name || 'Unknown',
        avatarUrl: member.profiles?.avatar_url || null,
        imageUrl: devotional?.image_url || null,
        hasPosted,
        createdAt: devotional?.created_at || (hasCompletedDaily ? new Date().toISOString() : null),
        likes: devotional?.likes_count || 0,
        devotionalId: devotional?.id,
        isLiked: devotional ? likedDevotionalIds.has(devotional.id) : false,
        // Daily devotional info
        isDailyDevotional: hasCompletedDaily && !devotional,
        dailyDevotionalComment: dailyCompletion?.hasComment ? dailyCompletion.commentText : undefined,
        dailyDevotionalCommentId: dailyCompletion?.commentId,
        dailyDevotionalImageUrl: hasCompletedDaily && !devotional ? dailyDevotionalImageUrl || undefined : undefined,
      };
    });
  }, [groupMembers, devotionals, likedDevotionalIds, dailyCompletions, dailyCompletionUserIds, dailyDevotionalImageUrl]);

  // Feed submissions (only those who posted WITH IMAGES, sorted by most recent)
  // Exclude daily devotional completions without images
  const feedSubmissions = useMemo(() => {
    return memberSubmissions
      .filter((m) => m.hasPosted && m.imageUrl) // Only show entries with images
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [memberSubmissions]);

  // Check if current user has posted an image devotional
  const currentUserHasImagePost = useMemo(() => {
    return devotionals.some((d) => d.user_id === currentUserId);
  }, [devotionals, currentUserId]);

  // Check if current user has posted (either image devotional or daily devotional completion)
  const currentUserHasPosted = useMemo(() => {
    const hasDailyDevotional = currentUserId ? dailyCompletionUserIds.has(currentUserId) : false;
    return currentUserHasImagePost || hasDailyDevotional;
  }, [currentUserHasImagePost, currentUserId, dailyCompletionUserIds]);

  // Check if current user completed daily devotional
  const currentUserCompletedDaily = useMemo(() => {
    return currentUserId ? dailyCompletionUserIds.has(currentUserId) : false;
  }, [currentUserId, dailyCompletionUserIds]);

  // Check if current user has uploaded an image devotional (used to show plus button for adding image even after in-app completion)
  const currentUserHasUploadedImage = useMemo(() => {
    return currentUserId ? devotionals.some((d) => d.user_id === currentUserId) : false;
  }, [devotionals, currentUserId]);

  // Build story slides - one slide per story item (daily and/or image)
  // Members can have multiple slides (daily + image)
  const storySlides: StorySlide[] = useMemo(() => {
    const slides: StorySlide[] = [];
    
    // Only include members who have posted
    const postedMembers = memberSubmissions.filter((m) => m.hasPosted);
    
    // Sort members: current user first, then by posted status, then alphabetically
    const sortedMembers = [...postedMembers].sort((a, b) => {
      if (a.memberId === currentUserId) return -1;
      if (b.memberId === currentUserId) return 1;
      return a.memberName.localeCompare(b.memberName);
    });

    for (const member of sortedMembers) {
      const hasCompletedDaily = dailyCompletionUserIds.has(member.memberId);
      const hasImageDevotional = !!member.imageUrl;
      const dailyCompletion = dailyCompletions.get(member.memberId);

      // Add daily devotional slide if completed (always show if they completed daily)
      if (hasCompletedDaily) {
        slides.push({
          memberId: member.memberId,
          memberName: member.memberName,
          type: 'daily',
          imageUrl: dailyDevotionalImageUrl || '',
          title: 'Completed in app devotional',
          dailyDevotionalComment: dailyCompletion?.hasComment ? dailyCompletion.commentText : undefined,
          dailyDevotionalCommentId: dailyCompletion?.commentId,
        });
      }

      // Add image devotional slide if posted
      if (hasImageDevotional && member.imageUrl) {
        slides.push({
          memberId: member.memberId,
          memberName: member.memberName,
          type: 'image',
          imageUrl: member.imageUrl,
          devotionalId: member.devotionalId,
          isLiked: member.isLiked,
          likes: member.likes,
        });
      }
    }

    return slides;
  }, [memberSubmissions, dailyCompletionUserIds, dailyCompletions, dailyDevotionalImageUrl, currentUserId]);

  // Progress counts: include anyone who completed (in-app devotional OR uploaded image)
  const completedCount = memberSubmissions.filter((m) => m.hasPosted).length;
  const totalMembers = groupMembers.length;

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDevotionals(true), // Force refresh
      fetchDailyCompletions(),
    ]);
    setRefreshing(false);
  }, [fetchDevotionals, fetchDailyCompletions]);

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (imageUri: string): Promise<string | null> => {
    if (!currentUserId) {
      logger.error('No current user ID for upload', undefined, {});
      return null;
    }

    try {
      logger.info('Starting image upload', { originalUri: imageUri, userId: currentUserId });

      // Validate image before uploading
      const validation = await validateImage(imageUri, {
        maxSize: 5 * 1024 * 1024, // 5MB limit
        maxWidth: 4000,
        maxHeight: 4000,
      });

      if (!validation.valid) {
        logger.error('Image validation failed', undefined, {
          error: validation.error,
          userId: currentUserId,
          originalUri: imageUri,
        });
        throw new Error(validation.error || 'Invalid image');
      }

      // Use the localUri from validation (may be a temp file:// copy of the original)
      const uploadUri = validation.localUri || imageUri;

      logger.info('Image validated successfully', {
        fileSize: validation.fileSize,
        mimeType: validation.mimeType,
        userId: currentUserId,
        uploadUri,
      });

      // Create file name with user ID and timestamp
      const fileExt = uploadUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = generateUniqueFilename(`devotional.${fileExt}`, currentUserId);
      const filePathWithFolder = `${currentUserId}/${fileName}`;

      // For React Native, we need to create a FormData and use the file URI directly
      const formData = new FormData();
      formData.append('file', {
        uri: uploadUri,
        name: fileName,
        type: validation.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      // Upload to Supabase Storage using fetch with FormData
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
        logger.error('Failed to upload image to storage', undefined, {
          status: uploadResponse.status,
          error: errorText,
          userId: currentUserId,
        });
        return null;
      }

      const uploadDuration = Date.now() - startTime;
      logger.info('Image uploaded successfully', {
        duration: `${uploadDuration}ms`,
        userId: currentUserId,
        fileSize: validation.fileSize,
      });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('devotionals')
        .getPublicUrl(filePathWithFolder);

      return urlData.publicUrl;
    } catch (error) {
      logger.error('Error in uploadImage', error as Error, { userId: currentUserId });
      return null;
    }
  }, [currentUserId]);

  // Add devotional
  const addDevotional = useCallback(async (imageUrl: string) => {
    if (!currentGroup?.id || !currentUserId) return;

    try {
      // Check if already posted an image devotional today
      const { data: existing } = await supabase
        .from('devotionals')
        .select('id')
        .eq('group_id', currentGroup.id)
        .eq('user_id', currentUserId)
        .eq('post_date', selectedDateISO)
        .not('image_url', 'is', null)
        .single();

      if (existing) {
        await supabase
          .from('devotionals')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        const now = new Date().toISOString();
        setDevotionals((prev) =>
          prev.map((d) =>
            d.id === existing.id ? { ...d, image_url: imageUrl, updated_at: now } : d
          )
        );
        lastFetchTime.current[selectedDateISO] = 0;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('devotionals')
          .insert({
            group_id: currentGroup.id,
            user_id: currentUserId,
            image_url: imageUrl,
            post_date: selectedDateISO,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        await updateStreak();

        // Optimistic update: show new post immediately so modal can close without waiting for refetch
        if (inserted && profile) {
          const newEntry: DevotionalWithProfile = {
            ...inserted,
            profiles: profile,
            likes_count: 0,
            user_liked: false,
          } as DevotionalWithProfile;
          setDevotionals((prev) => [...prev, newEntry]);
          lastFetchTime.current[selectedDateISO] = 0; // Invalidate cache so next refetch is fresh
        }
      }

      // Refetch in background (force refresh) so list stays in sync; don't await so modal closes fast
      fetchDevotionals(true);
    } catch (error) {
      console.error('Error adding devotional:', error);
      throw error;
    }
  }, [currentGroup?.id, currentUserId, selectedDateISO, fetchDevotionals, profile]);

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

  // Add daily devotional (when all 3 items are completed)
  // This only updates the streak - it does NOT create a devotional entry
  // The story will be shown based on daily_devotional_completions table
  const addDailyDevotional = useCallback(async () => {
    if (!currentGroup?.id || !currentUserId) {
      throw new Error('User or group not available');
    }

    try {
      // Verify all 3 items are completed
      const { data: completion } = await supabase
        .from('daily_devotional_completions')
        .select('scripture_completed, devotional_completed, prayer_completed')
        .eq('user_id', currentUserId)
        .eq('group_id', currentGroup.id)
        .eq('date', selectedDateISO)
        .single();

      if (!completion || !completion.scripture_completed || !completion.devotional_completed || !completion.prayer_completed) {
        throw new Error('All items must be completed first');
      }

      // Only update streak - do NOT create a devotional entry
      // The story will be shown based on daily_devotional_completions table
      await updateStreak();

      // Refresh data to update streak display and story
      await fetchDevotionals();
    } catch (error) {
      console.error('Error adding daily devotional:', error);
      throw error;
    }
  }, [currentGroup?.id, currentUserId, selectedDateISO, updateStreak, fetchDevotionals]);

  return {
    memberSubmissions,
    feedSubmissions,
    storySlides,
    currentUserHasPosted,
    currentUserCompletedDaily,
    currentUserHasImagePost,
    completedCount,
    totalMembers,
    currentUserStreak: userStreak,
    loading,
    refreshing,
    fetchDevotionals,
    onRefresh,
    addDevotional,
    addDailyDevotional,
    deleteDevotional,
    toggleLike,
    uploadImage,
  };
};

