/**
 * DevotionalSection Component
 *
 * Displays today's devotionals in a story row format on the home screen.
 * Extracted from HomeScreen to improve code organization and reusability.
 *
 * Features:
 * - Story row with member submissions
 * - "See All" navigation to devotionals screen
 * - Add devotional button
 * - Conditionally renders only if there are submissions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { StoryRow } from '../../devotionals/components';

export interface DevotionalMember {
  memberId: string;
  memberName: string;
  imageUrl: string | null;
  createdAt: string | null;
  devotionalId: string | null;
  likes: number;
  isLiked: boolean;
}

export interface DevotionalSectionProps {
  members: DevotionalMember[];
  currentUserId: string;
  currentUserHasPosted: boolean;
  onMemberPress: (memberId: string) => void;
  onAddPress: () => void;
  onSeeAllPress: () => void;
}

export const DevotionalSection: React.FC<DevotionalSectionProps> = ({
  members,
  currentUserId,
  currentUserHasPosted,
  onMemberPress,
  onAddPress,
  onSeeAllPress,
}) => {
  const { colors } = useTheme();

  // Don't render if no submissions
  if (members.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          DEVOTIONALS
        </Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            See All →
          </Text>
        </TouchableOpacity>
      </View>

      <StoryRow
        members={members}
        currentUserId={currentUserId}
        currentUserHasPosted={currentUserHasPosted}
        onMemberPress={onMemberPress}
        onAddPress={onAddPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
});
