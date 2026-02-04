// Daily Devotional API integration for fetching devotionals from devotional-api.vercel.app

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from './supabase';

export interface DailyDevotionalResponse {
  title: string;
  date: string;
  author: string;
  scripture: string;
  featured_verse: string;
  content: string[];
  reflect_pray: {
    question: string;
    prayer: string;
  };
  insights: string;
  bible_in_year: {
    old_testament: string;
    new_testament: string;
  };
  url: string;
  image_url: string;
}

const DEVOTIONAL_API_BASE_URL = 'https://devotional-api.vercel.app';

// Cache keys for persistent storage
const DEVOTIONAL_CACHE_KEY_PREFIX = '@rooted:daily_devotional:';

// In-memory cache for devotionals by date (same for all users)
const cachedDevotionals = new Map<string, DailyDevotionalResponse>();
const fetchPromises = new Map<string, Promise<DailyDevotionalResponse | null>>();

/**
 * Get today's date string in YYYY-MM-DD format
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Load cached devotional from persistent storage
 */
const loadCachedDevotional = async (date: string): Promise<DailyDevotionalResponse | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(`${DEVOTIONAL_CACHE_KEY_PREFIX}${date}`);
    if (cachedData) {
      const parsed = JSON.parse(cachedData) as DailyDevotionalResponse;
      cachedDevotionals.set(date, parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Error reading devotional cache:', error);
  }
  return null;
};

/**
 * Save devotional to persistent storage
 */
const saveCachedDevotional = async (data: DailyDevotionalResponse, date: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${DEVOTIONAL_CACHE_KEY_PREFIX}${date}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving devotional cache:', error);
  }
};

/**
 * Fetch a devotional for a specific date with caching (Supabase + local)
 */
export const fetchDevotionalByDate = async (date: string): Promise<DailyDevotionalResponse | null> => {
  const today = getTodayDateString();

  if (cachedDevotionals.has(date)) {
    return cachedDevotionals.get(date) || null;
  }

  const persistentCache = await loadCachedDevotional(date);
  if (persistentCache) {
    return persistentCache;
  }

  const existingPromise = fetchPromises.get(date);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const { data: cachedRow, error: cacheError } = await supabase
        .from('daily_devotionals')
        .select('data')
        .eq('date', date)
        .single();

      if (cacheError && cacheError.code !== 'PGRST116') {
        console.error('Error fetching devotional cache:', cacheError);
      }

      if (cachedRow?.data) {
        const cachedData = cachedRow.data as DailyDevotionalResponse;
        cachedDevotionals.set(date, cachedData);
        await saveCachedDevotional(cachedData, date);
        return cachedData;
      }

      const url = date === today
        ? `${DEVOTIONAL_API_BASE_URL}/today`
        : `${DEVOTIONAL_API_BASE_URL}/date/${date}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DailyDevotionalResponse = await response.json();

      cachedDevotionals.set(date, data);
      await saveCachedDevotional(data, date);

      const { error: insertError } = await supabase
        .from('daily_devotionals')
        .upsert({ date, data }, { onConflict: 'date' });

      if (insertError) {
        console.error('Error saving devotional cache:', insertError);
      }

      return data;
    } catch (error) {
      console.error('Error fetching daily devotional:', error);
      return null;
    } finally {
      fetchPromises.delete(date);
    }
  })();

  fetchPromises.set(date, fetchPromise);
  return fetchPromise;
};

/**
 * Fetch today's devotional from the API with caching (fast-path)
 */
export const fetchTodayDevotional = async (): Promise<DailyDevotionalResponse | null> => {
  const today = getTodayDateString();
  return fetchDevotionalByDate(today);
};

/**
 * Clear the in-memory cache (useful when app backgrounds)
 */
export const clearDevotionalCache = (): void => {
  cachedDevotionals.clear();
  fetchPromises.clear();
};

/**
 * Initialize app state listener to clear cache when app backgrounds
 * Call this once at app startup
 */
export const initializeDevotionalCacheLifecycle = (): (() => void) => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      clearDevotionalCache();
    }
  });

  return () => {
    subscription.remove();
  };
};
