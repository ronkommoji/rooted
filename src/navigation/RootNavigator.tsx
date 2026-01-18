import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { useNotificationContext } from '../context/NotificationContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { GrowthAnimation } from '../components/GrowthAnimation';
import { fetchTodayDevotional } from '../lib/devotionalApi';

export const RootNavigator: React.FC = () => {
  const { session, isLoading } = useAuth();
  const { currentGroup, isGroupChecked } = useAppStore();
  const { colors } = useTheme();
  const { navigationRef } = useNotificationContext();
  const [animationCompleted, setAnimationCompleted] = useState(false);

  // Pre-fetch daily devotional as early as possible (during splash screen)
  useEffect(() => {
    // Start fetching devotional in background - don't await, let it run async
    fetchTodayDevotional().catch((error) => {
      // Silently fail - the hook will handle fetching when needed
      console.error('Pre-fetch devotional error:', error);
    });
  }, []);

  // Check if app is ready (auth and group checks complete)
  const isAppReady = !isLoading && (session ? isGroupChecked : true);
  
  // Show animation if it hasn't completed yet
  if (!animationCompleted) {
    return (
      <View style={[styles.container, styles.beigeBackground]}>
        <GrowthAnimation onComplete={() => setAnimationCompleted(true)} />
      </View>
    );
  }

  // If animation completed but app isn't ready yet, show minimal loading
  if (!isAppReady) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!session ? (
        <AuthNavigator />
      ) : !currentGroup ? (
        <OnboardingScreen />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beigeBackground: {
    backgroundColor: '#F5F4EF',
  },
});

