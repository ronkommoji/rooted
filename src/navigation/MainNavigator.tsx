import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PrayerWallScreen } from '../screens/prayers/PrayerWallScreen';
import { BibleScreen } from '../screens/bible/BibleScreen';
import { DevotionalsScreen } from '../screens/devotionals/DevotionalsScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ChapterViewScreen } from '../screens/bible/ChapterViewScreen';
import { ScriptureDetailScreen } from '../screens/devotionals/scripture/ScriptureDetailScreen';
import { DevotionalDetailScreen } from '../screens/devotionals/devotional/DevotionalDetailScreen';
import { PrayerDetailScreen } from '../screens/devotionals/prayer/PrayerDetailScreen';

export type MainTabParamList = {
  Home: undefined;
  Prayers: undefined;
  Bible: undefined;
  Devotionals: undefined;
  Events: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  ChapterView: { book: string; chapter: number };
  ScriptureDetail: undefined;
  DevotionalDetail: undefined;
  PrayerDetail: undefined;
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
    case 'Bible':
      return (
        <Ionicons 
          name={focused ? 'book' : 'book-outline'} 
          size={iconSize} 
          color={color} 
        />
      );
    case 'Devotionals':
      return (
        <Ionicons 
          name={focused ? 'library' : 'library-outline'} 
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

  // Use white for inactive tabs in dark mode (matching image), black in light mode
  const inactiveColor = isDark ? '#FDFBF7' : '#2B2B2B';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: isDark ? '#3D5A50' : colors.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? colors.background : colors.card,
          borderTopColor: isDark ? '#2A2A2A' : colors.cardBorder,
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
        name="Bible" 
        component={BibleScreen}
        options={{ tabBarLabel: 'Bible' }}
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
        name="ChapterView" 
        component={ChapterViewScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="ScriptureDetail" 
        component={ScriptureDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="DevotionalDetail" 
        component={DevotionalDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="PrayerDetail" 
        component={PrayerDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};
