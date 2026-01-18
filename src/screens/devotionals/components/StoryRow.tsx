import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export interface MemberSubmission {
  memberId: string;
  memberName: string;
  imageUrl: string | null;
  hasPosted: boolean;
  createdAt: string | null;
  likes: number;
  devotionalId?: string;
  isLiked?: boolean;
  // For daily devotional completions
  isDailyDevotional?: boolean;
  dailyDevotionalComment?: string;
  dailyDevotionalCommentId?: string;
  dailyDevotionalImageUrl?: string; // Image from the /today API endpoint
}

interface StoryRowProps {
  members: MemberSubmission[];
  currentUserId: string;
  currentUserHasPosted: boolean;
  onMemberPress: (memberId: string) => void;
  onAddPress: () => void;
}

export const StoryRow: React.FC<StoryRowProps> = ({
  members,
  currentUserId,
  currentUserHasPosted,
  onMemberPress,
  onAddPress,
}) => {
  const { colors, isDark } = useTheme();

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getFirstName = (name: string) => {
    return name.split(' ')[0];
  };

  // Sort: current user first (if posted), then those who posted, then those who haven't
  const sortedMembers = [...members].sort((a, b) => {
    // Current user always comes first
    if (a.memberId === currentUserId) return -1;
    if (b.memberId === currentUserId) return 1;
    
    // Then prioritize those who have posted
    if (a.hasPosted && !b.hasPosted) return -1;
    if (!a.hasPosted && b.hasPosted) return 1;
    
    // Within same group (both posted or both haven't), sort alphabetically
    return a.memberName.localeCompare(b.memberName);
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedMembers.map((member) => {
          const isCurrentUser = member.memberId === currentUserId;
          const hasPosted = member.hasPosted;
          const ringColor = hasPosted ? (isDark ? '#3D5A50' : colors.primary) : colors.cardBorder;
          const canTap = hasPosted || (isCurrentUser && !hasPosted);

          return (
            <TouchableOpacity
              key={member.memberId}
              style={styles.memberContainer}
              onPress={() => {
                if (isCurrentUser && !hasPosted) {
                  onAddPress();
                } else if (hasPosted) {
                  onMemberPress(member.memberId);
                }
              }}
              disabled={!canTap}
              activeOpacity={canTap ? 0.7 : 1}
            >
              <View
                style={[
                  styles.avatarRing,
                  { borderColor: ringColor },
                  !hasPosted && !isCurrentUser && { opacity: 0.5 },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: isDark ? '#3A3A3A' : '#E8E7E2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: colors.text },
                    ]}
                  >
                    {getInitials(member.memberName)}
                  </Text>
                </View>

                {/* Add badge for current user who hasn't posted */}
                {isCurrentUser && !hasPosted && (
                  <View style={[styles.addBadge, { backgroundColor: isDark ? '#3D5A50' : colors.primary }]}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.memberName,
                  { color: colors.textSecondary },
                  !hasPosted && !isCurrentUser && { opacity: 0.5 },
                ]}
                numberOfLines={1}
              >
                {isCurrentUser ? 'You' : getFirstName(member.memberName)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  memberContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 68,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    padding: 3,
    marginBottom: 6,
  },
  avatar: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

