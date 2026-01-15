import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For native platforms, we'd use SecureStore but for simplicity, using AsyncStorage
// which works across all platforms
const storage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore errors
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

// Get Supabase credentials from environment variables
// For Expo, use EXPO_PUBLIC_ prefix for client-accessible variables
// These are set at build time via EAS secrets or .env file for local development
const getSupabaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
    console.error('For local development: Create a .env file with EXPO_PUBLIC_SUPABASE_URL');
    console.error('For EAS builds: Set secret with: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"');
    // Return a placeholder to prevent immediate crash - app will fail gracefully when trying to use Supabase
    return 'https://placeholder.supabase.co';
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
    console.error('For local development: Create a .env file with EXPO_PUBLIC_SUPABASE_ANON_KEY');
    console.error('For EAS builds: Set secret with: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"');
    // Return a placeholder to prevent immediate crash - app will fail gracefully when trying to use Supabase
    return 'placeholder-key';
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Check if we have real credentials (not placeholders)
const hasValidCredentials = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key';

if (!hasValidCredentials) {
  console.warn('⚠️ Supabase not properly configured. App features will be limited.');
  console.warn('⚠️ Set environment variables to enable full functionality.');
}

// Create Supabase client
// Even with placeholder credentials, the client can be created
// It will fail gracefully when making actual API calls
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export URL for reference
export { supabaseUrl };
