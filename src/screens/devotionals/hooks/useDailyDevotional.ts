import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isAfter, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useAppStore } from '../../../store/useAppStore';
import { fetchDevotionalByDate, DailyDevotionalResponse } from '../../../lib/devotionalApi';
import { notifyDailyDevotionalCompletion } from '../../../lib/dailyDevotionalEvents';

export interface DailyDevotionalCompletion {
  scripture_completed: boolean;
  devotional_completed: boolean;
  prayer_completed: boolean;
}

interface CompletionCacheEntry {
  date: string;
  data: DailyDevotionalCompletion;
  updatedAt: number;
}

let globalCompletionCache: Record<string, CompletionCacheEntry> = {};
const completionSubscribers = new Set<(entry: CompletionCacheEntry) => void>();
const refreshSubscribers = new Set<() => Promise<void>>();

const notifyCompletionSubscribers = (entry: CompletionCacheEntry) => {
  completionSubscribers.forEach((listener) => listener(entry));
};

/**
 * Request refresh of daily devotional data from outside (e.g. home pull-to-refresh).
 * Calls refresh() on all currently mounted useDailyDevotional instances.
 */
export const requestDailyDevotionalRefresh = (): Promise<void> => {
  if (refreshSubscribers.size === 0) return Promise.resolve();
  return Promise.all([...refreshSubscribers].map((fn) => fn())).then(() => {});
};

interface UseDailyDevotionalReturn {
  // Data
  devotional: DailyDevotionalResponse | null;
  completion: DailyDevotionalCompletion | null;
  allCompleted: boolean;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  markScriptureComplete: () => Promise<void>;
  markDevotionalComplete: () => Promise<void>;
  markPrayerComplete: () => Promise<void>;
  refresh: () => Promise<void>;
  completeDailyDevotional: () => Promise<void>; // Called when all 3 are complete
}

// Cache duration: 2 minutes for devotional, 30 seconds for completion
const DEVOTIONAL_CACHE_DURATION_MS = 2 * 60 * 1000;
const COMPLETION_CACHE_DURATION_MS = 30 * 1000;
const isFullyCompleted = (data: DailyDevotionalCompletion) =>
  data.scripture_completed && data.devotional_completed && data.prayer_completed;

export const useDailyDevotional = (date?: string): UseDailyDevotionalReturn => {
  const { currentGroup, session } = useAppStore();
  
  const [devotional, setDevotional] = useState<DailyDevotionalResponse | null>(null);
  const [completion, setCompletion] = useState<DailyDevotionalCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completionRef = useRef<DailyDevotionalCompletion | null>(null);

  // Cache tracking
  const devotionalCache = useRef<Record<string, { data: DailyDevotionalResponse; fetchedAt: number }>>({});
  const completionCache = useRef<Record<string, { data: DailyDevotionalCompletion; fetchedAt: number }>>({});

  const today = format(new Date(), 'yyyy-MM-dd');
  const targetDate = date ?? today;
  const isFutureDate = isAfter(parseISO(targetDate), parseISO(today));
  const currentUserId = session?.user?.id;
  const currentGroupId = currentGroup?.id;

  const getDefaultCompletion = useCallback((): DailyDevotionalCompletion => ({
    scripture_completed: false,
    devotional_completed: false,
    prayer_completed: false,
  }), []);

  const setCompletionState = useCallback((data: DailyDevotionalCompletion) => {
    completionRef.current = data;
    setCompletion(data);
  }, []);

  const updateGlobalCompletionCache = useCallback((data: DailyDevotionalCompletion) => {
    const entry: CompletionCacheEntry = {
      date: targetDate,
      data,
      updatedAt: Date.now(),
    };
    globalCompletionCache[targetDate] = entry;
    notifyCompletionSubscribers(entry);
  }, [targetDate]);

  // Fetch devotional for target date from API/cache
  const fetchDevotional = useCallback(async (): Promise<DailyDevotionalResponse | null> => {
    try {
      const data = await fetchDevotionalByDate(targetDate);
      if (data) {
        setDevotional(data);
        setError(null);
        return data;
      } else {
        setError('Failed to fetch daily devotional');
        return null;
      }
    } catch (err) {
      console.error('Error fetching devotional:', err);
      setError('Failed to fetch daily devotional');
      return null;
    }
  }, [targetDate]);

  // Fetch completion status from database
  const fetchCompletion = useCallback(async (): Promise<DailyDevotionalCompletion | null> => {
    if (!currentUserId || !currentGroupId) {
      // Set default completion state immediately if no user/group
      const defaultCompletion = getDefaultCompletion();
      setCompletionState(defaultCompletion);
      return defaultCompletion;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_devotional_completions')
        .select('scripture_completed, devotional_completed, prayer_completed')
        .eq('user_id', currentUserId)
        .eq('group_id', currentGroupId)
        .eq('date', targetDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching completion:', fetchError);
        // Set default state on error
        const defaultCompletion = {
          scripture_completed: false,
          devotional_completed: false,
          prayer_completed: false,
        };
        setCompletion(defaultCompletion);
        return defaultCompletion;
      }

      if (data) {
        const completionData = {
          scripture_completed: data.scripture_completed || false,
          devotional_completed: data.devotional_completed || false,
          prayer_completed: data.prayer_completed || false,
        };
        setCompletionState(completionData);
        updateGlobalCompletionCache(completionData);
        return completionData;
      } else {
        // No completion record exists yet - set default immediately
        const defaultCompletion = getDefaultCompletion();
        setCompletionState(defaultCompletion);
        updateGlobalCompletionCache(defaultCompletion);
        return defaultCompletion;
      }
    } catch (err) {
      console.error('Error in fetchCompletion:', err);
      // Set default state on error
      const defaultCompletion = getDefaultCompletion();
      setCompletionState(defaultCompletion);
      updateGlobalCompletionCache(defaultCompletion);
      return defaultCompletion;
    }
  }, [currentUserId, currentGroupId, targetDate, getDefaultCompletion, setCompletionState, updateGlobalCompletionCache]);

  // Initialize: fetch both devotional and completion with caching
  useEffect(() => {
    const initialize = async () => {
      if (isFutureDate) {
        setDevotional(null);
        setError(null);
        setCompletionState(getDefaultCompletion());
        setLoading(false);
        return;
      }

      const now = Date.now();
      const globalEntry = globalCompletionCache[targetDate];
      if (globalEntry) {
        completionCache.current[targetDate] = {
          data: globalEntry.data,
          fetchedAt: globalEntry.updatedAt,
        };
      }

      const cachedDevotionalEntry = devotionalCache.current[targetDate];
      const cachedCompletionEntry = completionCache.current[targetDate];

      const shouldFetchDevotional =
        !cachedDevotionalEntry ||
        now - cachedDevotionalEntry.fetchedAt > DEVOTIONAL_CACHE_DURATION_MS;

      const shouldFetchCompletion =
        !cachedCompletionEntry ||
        now - cachedCompletionEntry.fetchedAt > COMPLETION_CACHE_DURATION_MS;

      if (!shouldFetchDevotional && !shouldFetchCompletion && cachedDevotionalEntry) {
        setDevotional(cachedDevotionalEntry.data);
        if (cachedCompletionEntry) {
          setCompletionState(cachedCompletionEntry.data);
        }
        setLoading(false);
        return;
      }

      if (shouldFetchDevotional || shouldFetchCompletion) {
        setLoading(true);
      }

      if (shouldFetchDevotional) {
        const data = await fetchDevotional();
        if (data) {
          devotionalCache.current[targetDate] = { data, fetchedAt: now };
        }
      } else if (cachedDevotionalEntry) {
        setDevotional(cachedDevotionalEntry.data);
      }

      if (shouldFetchCompletion) {
        const completionData = await fetchCompletion();
        if (completionData) {
          completionCache.current[targetDate] = { data: completionData, fetchedAt: now };
        }
      } else if (cachedCompletionEntry) {
        setCompletionState(cachedCompletionEntry.data);
      }

      setLoading(false);
    };
    
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    targetDate,
    currentUserId,
    currentGroupId,
    fetchCompletion,
    fetchDevotional,
    getDefaultCompletion,
    isFutureDate,
    setCompletionState,
  ]); // Only depend on values that should trigger re-fetch

  useEffect(() => {
    const handleCompletionUpdate = (entry: CompletionCacheEntry) => {
      if (entry.date !== targetDate) return;
      completionCache.current[targetDate] = {
        data: entry.data,
        fetchedAt: entry.updatedAt,
      };
      setCompletionState(entry.data);
    };

    completionSubscribers.add(handleCompletionUpdate);
    return () => {
      completionSubscribers.delete(handleCompletionUpdate);
    };
  }, [targetDate, setCompletionState]);

  // Update completion in database
  const updateCompletion = useCallback(async (
    updates: Partial<DailyDevotionalCompletion>
  ) => {
    if (isFutureDate) return;
    if (!currentUserId || !currentGroupId) {
      throw new Error('User or group not available');
    }

    const cachedEntry = completionCache.current[targetDate];
    const previousCompletion =
      completionRef.current || cachedEntry?.data || getDefaultCompletion();
    const optimisticCompletion = {
      ...previousCompletion,
      ...updates,
    };
    setCompletionState(optimisticCompletion);
    completionCache.current[targetDate] = {
      data: optimisticCompletion,
      fetchedAt: Date.now(),
    };
    updateGlobalCompletionCache(optimisticCompletion);
    const wasAllCompleted = isFullyCompleted(previousCompletion);
    const isAllCompleted = isFullyCompleted(optimisticCompletion);
    if (isAllCompleted && !wasAllCompleted) {
      notifyDailyDevotionalCompletion({
        date: targetDate,
        userId: currentUserId,
        groupId: currentGroupId,
        completion: optimisticCompletion,
        allCompleted: true,
      });
    }

    try {
      // Try to update existing record
      const { data: existing, error: fetchError } = await supabase
        .from('daily_devotional_completions')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('group_id', currentGroupId)
        .eq('date', targetDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay, we'll create a new record
        throw fetchError;
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('daily_devotional_completions')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating completion:', updateError);
          throw updateError;
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('daily_devotional_completions')
          .insert({
            user_id: currentUserId,
            group_id: currentGroupId,
            date: targetDate,
            ...updates,
          });

        if (insertError) {
          console.error('Error inserting completion:', insertError);
          throw insertError;
        }
      }

      // Refresh completion state
      await fetchCompletion();
    } catch (err) {
      console.error('Error updating completion:', err);
      setCompletionState(previousCompletion);
      completionCache.current[targetDate] = {
        data: previousCompletion,
        fetchedAt: Date.now(),
      };
      updateGlobalCompletionCache(previousCompletion);
      throw err; // Re-throw so calling code can handle it
    }
  }, [
    currentUserId,
    currentGroupId,
    fetchCompletion,
    getDefaultCompletion,
    isFutureDate,
    setCompletionState,
    targetDate,
    updateGlobalCompletionCache,
  ]);

  const markScriptureComplete = useCallback(async () => {
    await updateCompletion({ scripture_completed: true });
  }, [updateCompletion]);

  const markDevotionalComplete = useCallback(async () => {
    await updateCompletion({ devotional_completed: true });
  }, [updateCompletion]);

  const markPrayerComplete = useCallback(async () => {
    await updateCompletion({ prayer_completed: true });
  }, [updateCompletion]);

  const refresh = useCallback(async () => {
    if (isFutureDate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([fetchDevotional(), fetchCompletion()]);
    setLoading(false);
  }, [fetchDevotional, fetchCompletion, isFutureDate]);

  // Register so requestDailyDevotionalRefresh() can trigger refresh (e.g. from Home pull-to-refresh)
  useEffect(() => {
    refreshSubscribers.add(refresh);
    return () => {
      refreshSubscribers.delete(refresh);
    };
  }, [refresh]);

  // Check if all items are completed
  const allCompleted = completion
    ? completion.scripture_completed &&
      completion.devotional_completed &&
      completion.prayer_completed
    : false;

  // Complete daily devotional - creates entry in devotionals table and updates streak
  // Note: This function should be called from a component that has access to useDevotionals
  // to properly update the streak. For now, we'll create the entry and the parent
  // component should handle streak updates via useDevotionals.addDailyDevotional
  const completeDailyDevotional = useCallback(async () => {
    if (isFutureDate || !allCompleted || !currentUserId || !currentGroupId) return;

    try {
      // Check if devotional entry already exists for today (any daily devotional entry)
      const { data: existingEntries } = await supabase
        .from('devotionals')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('group_id', currentGroupId)
        .eq('post_date', targetDate)
        .is('image_url', null);

      // Check if any of them is a daily devotional entry
      const hasDailyDevotional = existingEntries?.some((entry) => {
        // We can't check content here without selecting it, so we'll just check if any entry exists
        // The DevotionalDetailScreen should have already created one if needed
        return true;
      });

      // Don't create a new entry - the DevotionalDetailScreen already creates one when needed
      // This function should only be used for updating completion status, not creating entries
    } catch (err) {
      console.error('Error completing daily devotional:', err);
    }
  }, [allCompleted, currentUserId, currentGroupId, isFutureDate, targetDate]);

  return {
    devotional,
    completion,
    allCompleted,
    loading,
    error,
    markScriptureComplete,
    markDevotionalComplete,
    markPrayerComplete,
    refresh,
    completeDailyDevotional,
  };
};
