/**
 * FABMenu Component
 *
 * Floating Action Button with expanding menu for creating content.
 * Extracted from HomeScreen to improve code organization.
 *
 * Features:
 * - Animated menu expansion with staggered button animations
 * - Three menu options: Prayer, Event, Devotional
 * - Backdrop overlay when menu is open
 * - Rotating main FAB icon
 * - Smooth animations using React Native Animated API
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export interface FABMenuProps {
  onPrayerPress: () => void;
  onEventPress: () => void;
  onDevotionalPress: () => void;
}

export const FABMenu: React.FC<FABMenuProps> = ({
  onPrayerPress,
  onEventPress,
  onDevotionalPress,
}) => {
  const { colors, isDark } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const button1TranslateY = useRef(new Animated.Value(0)).current;
  const button2TranslateY = useRef(new Animated.Value(0)).current;
  const button3TranslateY = useRef(new Animated.Value(0)).current;
  const button1Opacity = useRef(new Animated.Value(0)).current;
  const button2Opacity = useRef(new Animated.Value(0)).current;
  const button3Opacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);

    // Animate backdrop
    Animated.timing(backdropOpacity, {
      toValue: toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate menu buttons with staggered delay
    const buttonAnimations = [
      { translateY: button1TranslateY, opacity: button1Opacity, delay: 0 },
      { translateY: button2TranslateY, opacity: button2Opacity, delay: 50 },
      { translateY: button3TranslateY, opacity: button3Opacity, delay: 100 },
    ];

    buttonAnimations.forEach(({ translateY, opacity, delay }) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: toValue ? -70 : 0,
          duration: 300,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: toValue ? 1 : 0,
          duration: 300,
          delay: delay,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Rotate main button
    Animated.timing(rotateAnim, {
      toValue: toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleMenuOptionPress = (
    option: 'prayer' | 'event' | 'devotional'
  ) => {
    toggleMenu();
    // Delay action until menu close animation completes
    setTimeout(() => {
      if (option === 'prayer') {
        onPrayerPress();
      } else if (option === 'event') {
        onEventPress();
      } else if (option === 'devotional') {
        onDevotionalPress();
      }
    }, 200);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Backdrop */}
      {isMenuOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableOpacity>
      )}

      {/* FAB Container */}
      <View style={styles.fabContainer}>
        {/* Prayer Button */}
        <Animated.View
          style={[
            styles.fabMenuButton,
            styles.fabMenuButton1,
            {
              opacity: button1Opacity,
              transform: [{ translateY: button1TranslateY }],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.fabMenuButtonInner, { backgroundColor: colors.card }]}
            onPress={() => handleMenuOptionPress('prayer')}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={[styles.fabMenuButtonLabel, { color: colors.text }]}>
              Prayer
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Event Button */}
        <Animated.View
          style={[
            styles.fabMenuButton,
            styles.fabMenuButton2,
            {
              opacity: button2Opacity,
              transform: [{ translateY: button2TranslateY }],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.fabMenuButtonInner, { backgroundColor: colors.card }]}
            onPress={() => handleMenuOptionPress('event')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.fabMenuButtonLabel, { color: colors.text }]}>
              Event
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Devotional Button */}
        <Animated.View
          style={[
            styles.fabMenuButton,
            styles.fabMenuButton3,
            {
              opacity: button3Opacity,
              transform: [{ translateY: button3TranslateY }],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.fabMenuButtonInner, { backgroundColor: colors.card }]}
            onPress={() => handleMenuOptionPress('devotional')}
            activeOpacity={0.7}
          >
            <Ionicons name="library" size={20} color={colors.primary} />
            <Text style={[styles.fabMenuButtonLabel, { color: colors.text }]}>
              Devotional
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: isDark ? '#3D5A50' : colors.primary }]}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  fabMenuButton1: {
    bottom: 160,
  },
  fabMenuButton2: {
    bottom: 110,
  },
  fabMenuButton3: {
    bottom: 60,
  },
  fabMenuButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    gap: 8,
  },
  fabMenuButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
