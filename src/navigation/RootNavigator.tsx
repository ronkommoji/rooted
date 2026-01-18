import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { useNotificationContext } from '../context/NotificationContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

export const RootNavigator: React.FC = () => {
  const { session, isLoading } = useAuth();
  const { currentGroup, isGroupChecked } = useAppStore();
  const { colors } = useTheme();
  const { navigationRef } = useNotificationContext();

  // Show loading screen while:
  // 1. Auth is loading, OR
  // 2. User is authenticated but we haven't checked for a group yet
  const shouldShowLoading = isLoading || (session && !isGroupChecked);

  if (shouldShowLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

