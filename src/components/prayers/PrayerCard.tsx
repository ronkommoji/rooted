/**
 * PrayerCard Component
 *
 * Memoized prayer card component for displaying prayer requests.
 * Extracted from PrayerWallScreen to reduce component complexity and improve performance.
 *
 * Features:
 * - React.memo optimization for preventing unnecessary re-renders
 * - Animated scale effect on prayer action
 * - Answered badge display
 * - Prayer count and actions
 * - Owner-only menu access
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../Card';
import { Avatar } from '../Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { timeAgo } from '../../lib/dateUtils';

export interface PrayerWithDetails {
  id: string;
  title: string;
  content?: string;
  user_id: string;
  created_at: string;
  is_answered: boolean;
  total_prayed: number;
  profiles: {
    full_name: string;
  };
}

export interface PrayerCardProps {
  prayer: PrayerWithDetails;
  isOwnPrayer: boolean;
  isProcessing?: boolean;
  isAnimating?: boolean;
  onPray: (prayer: PrayerWithDetails) => void;
  onMarkAnswered: (prayer: PrayerWithDetails) => void;
  onOpenMenu?: (prayer: PrayerWithDetails) => void;
  style?: ViewStyle;
}

/**
 * PrayerCard component - Optimized with React.memo
 *
 * Re-renders only when:
 * - Prayer data changes (id, title, content, total_prayed, is_answered)
 * - Processing state changes
 * - Animation state changes
 */
export const PrayerCard = React.memo<PrayerCardProps>(
  ({
    prayer,
    isOwnPrayer,
    isProcessing = false,
    isAnimating = false,
    onPray,
    onMarkAnswered,
    onOpenMenu,
    style,
  }) => {
    const { colors, isDark } = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Animate card when prayer action occurs
    useEffect(() => {
      if (isAnimating) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isAnimating, scaleAnim]);

    return (
      <Animated.View
        style={[
          styles.container,
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Card style={styles.card}>
          {/* Answered Badge */}
          {prayer.is_answered && (
            <View style={[styles.answeredBadge, { backgroundColor: colors.success }]}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#FFFFFF"
                style={styles.badgeIcon}
              />
              <Text style={styles.answeredText}>ANSWERED</Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Avatar name={prayer.profiles.full_name} size={40} />

            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {prayer.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {prayer.profiles.full_name} · {timeAgo(prayer.created_at || new Date().toISOString())}
              </Text>
            </View>

            {/* Menu Button (Owner Only) */}
            {isOwnPrayer && onOpenMenu && (
              <TouchableOpacity
                onPress={() => onOpenMenu(prayer)}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {prayer.content && (
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              {prayer.content}
            </Text>
          )}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.prayedCount}>
              <Text style={[styles.prayedText, { color: colors.textSecondary }]}>
                {prayer.total_prayed} prayed
              </Text>
            </View>

            <View style={styles.actions}>
              {/* Mark Answered Button (Owner Only, Not Answered) */}
              {!prayer.is_answered && isOwnPrayer && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.success }]}
                  onPress={() => onMarkAnswered(prayer)}
                >
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={colors.success}
                    style={styles.actionIcon}
                  />
                  <Text style={[styles.actionText, { color: colors.success }]}>Answered</Text>
                </TouchableOpacity>
              )}

              {/* Pray Button (Not Answered) */}
              {!prayer.is_answered && (
                <TouchableOpacity
                  style={[
                    styles.prayButton,
                    { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                    isProcessing && styles.prayButtonDisabled,
                  ]}
                  onPress={() => onPray(prayer)}
                  disabled={isProcessing}
                >
                  <MaterialCommunityIcons
                    name="hands-pray"
                    size={16}
                    color="#FFFFFF"
                    style={styles.actionIcon}
                  />
                  <Text style={styles.prayButtonText}>Prayed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  },
  // Custom comparison function for React.memo
  (prevProps, nextProps) => {
    return (
      prevProps.prayer.id === nextProps.prayer.id &&
      prevProps.prayer.title === nextProps.prayer.title &&
      prevProps.prayer.content === nextProps.prayer.content &&
      prevProps.prayer.total_prayed === nextProps.prayer.total_prayed &&
      prevProps.prayer.is_answered === nextProps.prayer.is_answered &&
      prevProps.isProcessing === nextProps.isProcessing &&
      prevProps.isAnimating === nextProps.isAnimating &&
      prevProps.isOwnPrayer === nextProps.isOwnPrayer
    );
  }
);

PrayerCard.displayName = 'PrayerCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    // Card styles handled by Card component
  },
  answeredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeIcon: {
    marginRight: 4,
  },
  answeredText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  prayedCount: {
    flex: 1,
  },
  prayedText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontWeight: '500',
    fontSize: 13,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  prayButtonDisabled: {
    opacity: 0.6,
  },
  prayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
