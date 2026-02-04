import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../components';
import { useDailyDevotional } from '../hooks/useDailyDevotional';

interface DailyDevotionalCardProps {
  onScripturePress?: () => void;
  onDevotionalPress?: () => void;
  onPrayerPress?: () => void;
  selectedDate?: Date;
}

export const DailyDevotionalCard: React.FC<DailyDevotionalCardProps> = ({
  onScripturePress,
  onDevotionalPress,
  onPrayerPress,
  selectedDate,
}) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { devotional, completion, loading, refresh } = useDailyDevotional(selectedDateString);

  // Note: Removed useFocusEffect that was forcing refresh on every focus
  // The hook now has built-in caching, so data will only refresh when needed

  const scriptureCompleted = completion?.scripture_completed || false;
  const devotionalCompleted = completion?.devotional_completed || false;
  const prayerCompleted = completion?.prayer_completed || false;

  const scriptureAnim = useRef(new Animated.Value(scriptureCompleted ? 1 : 0)).current;
  const devotionalAnim = useRef(new Animated.Value(devotionalCompleted ? 1 : 0)).current;
  const prayerAnim = useRef(new Animated.Value(prayerCompleted ? 1 : 0)).current;
  const previousCompletion = useRef({
    scripture: scriptureCompleted,
    devotional: devotionalCompleted,
    prayer: prayerCompleted,
  });

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const animateCheckmark = (
      anim: Animated.Value,
      isCompleted: boolean,
      wasCompleted: boolean
    ) => {
      if (isCompleted && !wasCompleted) {
        anim.setValue(0);
        Animated.spring(anim, {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (!isCompleted) {
        anim.setValue(0);
      }
    };

    animateCheckmark(scriptureAnim, scriptureCompleted, previousCompletion.current.scripture);
    animateCheckmark(devotionalAnim, devotionalCompleted, previousCompletion.current.devotional);
    animateCheckmark(prayerAnim, prayerCompleted, previousCompletion.current.prayer);

    previousCompletion.current = {
      scripture: scriptureCompleted,
      devotional: devotionalCompleted,
      prayer: prayerCompleted,
    };
  }, [
    scriptureCompleted,
    devotionalCompleted,
    prayerCompleted,
    scriptureAnim,
    devotionalAnim,
    prayerAnim,
    isFocused,
  ]);

  // Show skeleton/placeholder while loading to reserve space
  // This ensures the component is part of the page layout from the start
  if (loading || !devotional) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.skeletonDate, { backgroundColor: isDark ? '#2A2A2A' : '#E8E7E2' }]} />
            <View style={[styles.skeletonTitle, { backgroundColor: isDark ? '#2A2A2A' : '#E8E7E2' }]} />
          </View>
        </View>
        <View style={[styles.skeletonLabel, { backgroundColor: isDark ? '#2A2A2A' : '#E8E7E2' }]} />
        <View style={styles.itemsContainer}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.item,
                { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' },
              ]}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.skeletonIcon, { backgroundColor: isDark ? '#3A3A3A' : '#D0D0D0' }]} />
                <View style={[styles.skeletonText, { backgroundColor: isDark ? '#3A3A3A' : '#D0D0D0' }]} />
              </View>
              <View style={[styles.skeletonTime, { backgroundColor: isDark ? '#3A3A3A' : '#D0D0D0' }]} />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  const handleScripturePress = () => {
    if (onScripturePress) {
      onScripturePress();
    } else {
      navigation.navigate('ScriptureDetail', { date: selectedDateString });
    }
  };

  const handleDevotionalPress = () => {
    if (onDevotionalPress) {
      onDevotionalPress();
    } else {
      navigation.navigate('DevotionalDetail', { date: selectedDateString });
    }
  };

  const handlePrayerPress = () => {
    if (onPrayerPress) {
      onPrayerPress();
    } else {
      navigation.navigate('PrayerDetail', { date: selectedDateString });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'd MMM yyyy').toUpperCase();
    } catch {
      return dateString;
    }
  };

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(devotional.date)}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {devotional.title}
          </Text>
        </View>
      </View>

      {/* Daily Devotional Label */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        DAILY DEVOTIONAL
      </Text>

      {/* Items */}
      <View style={styles.itemsContainer}>
        {/* Scripture */}
        <TouchableOpacity
          style={[
            styles.item,
            { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' },
          ]}
          onPress={handleScripturePress}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <Ionicons
              name="book-outline"
              size={20}
              color={isDark ? '#3D5A50' : colors.primary}
            />
            <Text style={[styles.itemText, { color: colors.text }]}>Scripture</Text>
          </View>
          <View style={styles.itemRight}>
            {scriptureCompleted ? (
              <Animated.View
                style={{
                  transform: [{ scale: scriptureAnim }],
                  opacity: scriptureAnim,
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </Animated.View>
            ) : (
              <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                1 min
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Devotional */}
        <TouchableOpacity
          style={[
            styles.item,
            { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' },
          ]}
          onPress={handleDevotionalPress}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={isDark ? '#3D5A50' : colors.primary}
            />
            <Text style={[styles.itemText, { color: colors.text }]}>Devotional</Text>
          </View>
          <View style={styles.itemRight}>
            {devotionalCompleted ? (
              <Animated.View
                style={{
                  transform: [{ scale: devotionalAnim }],
                  opacity: devotionalAnim,
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </Animated.View>
            ) : (
              <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                3 min
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Prayer */}
        <TouchableOpacity
          style={[
            styles.item,
            { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' },
          ]}
          onPress={handlePrayerPress}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <Ionicons
              name="heart-outline"
              size={20}
              color={isDark ? '#3D5A50' : colors.primary}
            />
            <Text style={[styles.itemText, { color: colors.text }]}>Prayer</Text>
          </View>
          <View style={styles.itemRight}>
            {prayerCompleted ? (
              <Animated.View
                style={{
                  transform: [{ scale: prayerAnim }],
                  opacity: prayerAnim,
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </Animated.View>
            ) : (
              <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                2 min
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  itemsContainer: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Skeleton styles
  skeletonDate: {
    height: 14,
    width: 100,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 24,
    width: '80%',
    borderRadius: 4,
  },
  skeletonLabel: {
    height: 14,
    width: 150,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  skeletonText: {
    height: 16,
    width: 80,
    borderRadius: 4,
  },
  skeletonTime: {
    height: 14,
    width: 40,
    borderRadius: 4,
  },
});
