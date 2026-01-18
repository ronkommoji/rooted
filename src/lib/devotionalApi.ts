// Daily Devotional API integration for fetching devotionals from devotional-api.vercel.app

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
 * Fetch today's devotional from the API with caching
 */
export const fetchTodayDevotional = async (): Promise<DailyDevotionalResponse | null> => {
  const today = getTodayDateString();
  
  // Return cached data if it's for today
  if (cachedDevotional && cachedDate === today) {
    return cachedDevotional;
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
      
      // Cache the result
      cachedDevotional = data;
      cachedDate = today;
      
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
