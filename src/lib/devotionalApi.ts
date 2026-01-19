// Daily Devotional API integration for fetching devotionals from devotional-api.vercel.app

import AsyncStorage from '@react-native-async-storage/async-storage';

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
const DEVOTIONAL_CACHE_KEY = '@rooted:daily_devotional';
const DEVOTIONAL_CACHE_DATE_KEY = '@rooted:daily_devotional_date';

// In-memory cache for today's devotional (same for all users)
let cachedDevotional: DailyDevotionalResponse | null = null;
let cachedDate: string | null = null;
let fetchPromise: Promise<DailyDevotionalResponse | null> | null = null;

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
const loadCachedDevotional = async (): Promise<DailyDevotionalResponse | null> => {
  try {
    const cachedDateStr = await AsyncStorage.getItem(DEVOTIONAL_CACHE_DATE_KEY);
    const today = getTodayDateString();
    
    if (cachedDateStr === today) {
      const cachedData = await AsyncStorage.getItem(DEVOTIONAL_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData) as DailyDevotionalResponse;
        // Also update in-memory cache
        cachedDevotional = parsed;
        cachedDate = today;
        return parsed;
      }
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
    await AsyncStorage.setItem(DEVOTIONAL_CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(DEVOTIONAL_CACHE_DATE_KEY, date);
  } catch (error) {
    console.error('Error saving devotional cache:', error);
  }
};

/**
 * Fetch today's devotional from the API with caching (in-memory and persistent)
 */
export const fetchTodayDevotional = async (): Promise<DailyDevotionalResponse | null> => {
  const today = getTodayDateString();
  
  // Return in-memory cached data if it's for today
  if (cachedDevotional && cachedDate === today) {
    return cachedDevotional;
  }
  
  // Try to load from persistent cache
  const persistentCache = await loadCachedDevotional();
  if (persistentCache) {
    return persistentCache;
  }
  
  // If there's already a fetch in progress, return that promise
  if (fetchPromise) {
    return fetchPromise;
  }
  
  // Start new fetch
  fetchPromise = (async () => {
    try {
      const url = `${DEVOTIONAL_API_BASE_URL}/today`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DailyDevotionalResponse = await response.json();
      
      // Cache the result in memory
      cachedDevotional = data;
      cachedDate = today;
      
      // Save to persistent storage
      await saveCachedDevotional(data, today);
      
      return data;
    } catch (error) {
      console.error('Error fetching daily devotional:', error);
      return null;
    } finally {
      // Clear the promise so we can fetch again if needed
      fetchPromise = null;
    }
  })();
  
  return fetchPromise;
};
