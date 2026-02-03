import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 2;
const IMAGE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export const ProfileSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shimmerStyle = {
    opacity: shimmerOpacity,
  };

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Animated.View
          style={[
            styles.avatarSkeleton,
            { backgroundColor: colors.cardBorder },
            shimmerStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.nameSkeleton,
            { backgroundColor: colors.cardBorder },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Animated.View
              style={[
                styles.statIconSkeleton,
                { backgroundColor: colors.cardBorder },
                shimmerStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.statValueSkeleton,
                { backgroundColor: colors.cardBorder },
                shimmerStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.statLabelSkeleton,
                { backgroundColor: colors.cardBorder },
                shimmerStyle,
              ]}
            />
          </View>
        ))}
      </View>

      {/* Toggle Skeleton */}
      <Animated.View
        style={[
          styles.toggleSkeleton,
          { backgroundColor: colors.cardBorder },
          shimmerStyle,
        ]}
      />

      {/* Grid Skeleton */}
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
          <Animated.View
            key={item}
            style={[
              styles.gridItemSkeleton,
              { backgroundColor: colors.cardBorder },
              shimmerStyle,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarSkeleton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  nameSkeleton: {
    width: 180,
    height: 28,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statIconSkeleton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  statValueSkeleton: {
    width: 40,
    height: 28,
    borderRadius: 6,
    marginBottom: 4,
  },
  statLabelSkeleton: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
  toggleSkeleton: {
    width: '100%',
    height: 40,
    borderRadius: 20,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItemSkeleton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 4,
  },
});
