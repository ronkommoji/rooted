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

export const supabaseUrl = 'https://bmwyusrojmrlmintpjks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtd3l1c3Jvam1ybG1pbnRwamtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDk2MDAsImV4cCI6MjA4MzMyNTYwMH0.5_vGwdT6X5U7KMdtblpyvWcsm-5xoSEMiORPetQqfgs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
