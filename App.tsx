import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import { initializeDevotionalCacheLifecycle } from './src/lib/devotionalApi';

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - matches current cache duration
      gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time
      retry: 1, // Retry failed queries once
      refetchOnWindowFocus: true, // Refetch when app comes to foreground
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
});

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'PlayfairDisplay_400Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay_700Bold': PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen once fonts are loaded (or if there's an error)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize devotional cache lifecycle management
  useEffect(() => {
    const cleanup = initializeDevotionalCacheLifecycle();
    return cleanup;
  }, []);

  // Don't render the app until fonts are loaded (or error occurs)
  // If fonts fail to load, the app will still render but use system fonts as fallback
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
