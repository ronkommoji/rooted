import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PrayerWallScreen } from '../screens/prayers/PrayerWallScreen';
import { DevotionalsScreen } from '../screens/devotionals/DevotionalsScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

export type MainTabParamList = {
  Home: undefined;
  Prayers: undefined;
  Devotionals: undefined;
  Events: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

const TabIcon = ({ name, focused, color }: { name: string; focused: boolean; color: string }) => {
  const iconSize = 24;

  switch (name) {
    case 'Home':
      return (
        <Ionicons 
          name={focused ? 'home' : 'home-outline'} 
          size={iconSize} 
          color={color} 
        />
      );
    case 'Prayers':
      return (
        <MaterialCommunityIcons 
          name="hands-pray" 
          size={iconSize} 
          color={color} 
        />
      );
    case 'Devotionals':
      return (
        <Ionicons 
          name={focused ? 'book' : 'book-outline'} 
          size={iconSize} 
          color={color} 
        />
      );
    case 'Events':
      return (
        <Ionicons 
          name={focused ? 'calendar' : 'calendar-outline'} 
          size={iconSize} 
          color={color} 
        />
      );
    default:
      return null;
  }
};

const MainTabs: React.FC = () => {
  const { colors, isDark } = useTheme();

  // Use white for inactive tabs in dark mode, black in light mode for better visibility
  const inactiveColor = isDark ? '#FFFFFF' : '#2B2B2B';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Prayers" 
        component={PrayerWallScreen}
        options={{ tabBarLabel: 'Prayers' }}
      />
      <Tab.Screen 
        name="Devotionals" 
        component={DevotionalsScreen}
        options={{ tabBarLabel: 'Devotionals' }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ tabBarLabel: 'Events' }}
      />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};
