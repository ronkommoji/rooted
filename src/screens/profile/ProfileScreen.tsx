import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, PillToggle } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { MainStackParamList } from '../../navigation/MainNavigator';
import type { Tables } from '../../types/database';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 2;
const IMAGE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

type ProfileScreenRouteProp = RouteProp<MainStackParamList, 'Profile'>;

interface DevotionalWithEngagement extends Tables<'devotionals'> {
  profiles: Tables<'profiles'>;
  likes_count: number;
  comments_count: number;
}

interface UserProfileData {
  profile: Tables<'profiles'>;
  isSameGroup: boolean;
  stats: {
    totalDevotionals: number;
    totalPrayers: number;
    currentStreak: number;
    contributionScore: number;
    totalLikes: number;
    totalComments: number;
  };
  devotionals: DevotionalWithEngagement[];
  prayers: Array<Tables<'prayers'> & { profiles: Tables<'profiles'> }>;
}

// Fetch user profile data
const fetchUserProfile = async (
  userId: string,
  currentGroupId: string,
  currentUserId: string
): Promise<UserProfileData | null> => {
  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  // 2. Check if user is in same group
  const { data: groupMember, error: groupError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', currentGroupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (groupError) {
    throw new Error('Failed to verify group membership');
  }

  const isSameGroup = !!groupMember;

  if (!isSameGroup) {
    // Return limited data if not in same group
    return {
      profile,
      isSameGroup: false,
      stats: {
        totalDevotionals: 0,
        totalPrayers: 0,
        currentStreak: 0,
        contributionScore: 0,
        totalLikes: 0,
        totalComments: 0,
      },
      devotionals: [],
      prayers: [],
    };
  }

  // 3. Fetch devotionals (all-time, current group only)
  const { data: devotionalsData } = await supabase
    .from('devotionals')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .eq('group_id', currentGroupId)
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false });

  const devotionals = devotionalsData || [];

  // 4. Fetch prayers (all-time, current group only)
  const { data: prayersData } = await supabase
    .from('prayers')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .eq('group_id', currentGroupId)
    .order('created_at', { ascending: false });

  const prayers = prayersData || [];

  // 5. Fetch devotional comments count (comments BY the user in the current group)
  const { count: commentsCount = 0 } = await supabase
    .from('devotional_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in(
      'devotional_id',
      // Get all devotional IDs from the current group
      (await supabase
        .from('devotionals')
        .select('id')
        .eq('group_id', currentGroupId)
        .then(({ data }) => (data || []).map((d) => d.id)))
    );

  // 6. Get user's devotional IDs for fetching likes/comments received
  const userDevotionalIds = devotionals.map((d) => d.id);

  // 7. Fetch likes and comments for each devotional
  let devotionalsWithEngagement: DevotionalWithEngagement[] = [];
  let totalLikes = 0;
  let totalCommentsReceived = 0;

  if (userDevotionalIds.length > 0) {
    // Fetch all likes for user's devotionals
    const { data: likesData } = await supabase
      .from('devotional_likes')
      .select('devotional_id')
      .in('devotional_id', userDevotionalIds);

    // Fetch all comments for user's devotionals
    const { data: commentsData } = await supabase
      .from('devotional_comments')
      .select('devotional_id')
      .in('devotional_id', userDevotionalIds);

    // Count likes per devotional
    const likesMap = new Map<string, number>();
    (likesData || []).forEach((like) => {
      likesMap.set(like.devotional_id, (likesMap.get(like.devotional_id) || 0) + 1);
    });

    // Count comments per devotional
    const commentsMap = new Map<string, number>();
    (commentsData || []).forEach((comment) => {
      commentsMap.set(comment.devotional_id, (commentsMap.get(comment.devotional_id) || 0) + 1);
    });

    // Combine data
    devotionalsWithEngagement = devotionals.map((d) => ({
      ...d,
      likes_count: likesMap.get(d.id) || 0,
      comments_count: commentsMap.get(d.id) || 0,
    }));

    totalLikes = likesData?.length || 0;
    totalCommentsReceived = commentsData?.length || 0;
  } else {
    devotionalsWithEngagement = devotionals.map((d) => ({
      ...d,
      likes_count: 0,
      comments_count: 0,
    }));
  }

  // 8. Fetch user streak
  const { data: streakData } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .eq('group_id', currentGroupId)
    .maybeSingle();

  const currentStreak = streakData?.current_streak || 0;

  // Calculate contribution score: 5 * devotionals + 2 * prayers + 2 * comments
  const contributionScore =
    devotionals.length * 5 + prayers.length * 2 + (commentsCount || 0) * 2;

  return {
    profile,
    isSameGroup: true,
    stats: {
      totalDevotionals: devotionals.length,
      totalPrayers: prayers.length,
      currentStreak,
      contributionScore,
      totalLikes,
      totalComments: totalCommentsReceived,
    },
    devotionals: devotionalsWithEngagement,
    prayers: prayers as any,
  };
};

export const ProfileScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { currentGroup, session } = useAppStore();
  const queryClient = useQueryClient();

  const { userId } = route.params;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;

  // Toggle state
  const [selectedTab, setSelectedTab] = useState<'Devotionals' | 'Prayers'>('Devotionals');
  const [prayerFilter, setPrayerFilter] = useState<'Praying' | 'Answered'>('Praying');
  const [showPrayerFilterMenu, setShowPrayerFilterMenu] = useState(false);

  // Fetch profile data
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: () => fetchUserProfile(userId, currentGroup?.id || '', currentUserId || ''),
    enabled: !!userId && !!currentGroup?.id && !!currentUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profileData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile not found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This user's profile is not available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData.isSameGroup) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This profile is only visible to members of the same group.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, stats, devotionals, prayers } = profileData;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isOwnProfile ? 'My Profile' : profile.full_name || 'Profile'}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Avatar name={profile.full_name} imageUrl={profile.avatar_url} size={100} />
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile.full_name || 'User'}
          </Text>
        </View>

        {/* KPI Cards - Horizontal Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="library" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalDevotionals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Devotionals</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <MaterialCommunityIcons name="hands-pray" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalPrayers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Prayers</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="trophy" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.contributionScore}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Contribution</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="flame" size={20} color="#FF6B35" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day Streak</Text>
          </Card>
        </View>

        {/* Toggle between Devotionals and Prayers */}
        <View style={styles.toggleContainer}>
          <PillToggle
            options={['Devotionals', 'Prayers']}
            selected={selectedTab}
            onSelect={(option) => setSelectedTab(option as 'Devotionals' | 'Prayers')}
          />
        </View>

        {/* Content based on selected tab */}
        {selectedTab === 'Devotionals' ? (
          // Devotionals Grid - Instagram style
          <View style={styles.gridSection}>
            {devotionals.length === 0 ? (
              <View style={styles.emptyGridState}>
                <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No devotionals yet
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {devotionals.map((devotional, index) => (
                  <TouchableOpacity
                    key={devotional.id}
                    style={styles.gridItem}
                    onPress={() =>
                      navigation.navigate('UserDevotionalsList', {
                        userId: userId,
                        userName: profile.full_name || 'User',
                        initialDevotionalId: devotional.id,
                      })
                    }
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: devotional.image_url || '' }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                    {/* Engagement stats in top right */}
                    <View style={styles.gridOverlay}>
                      {devotional.likes_count > 0 && (
                        <View style={styles.gridStat}>
                          <Ionicons name="heart" size={14} color="#FFFFFF" />
                          <Text style={styles.gridStatText}>{devotional.likes_count}</Text>
                        </View>
                      )}
                      {devotional.comments_count > 0 && (
                        <View style={styles.gridStat}>
                          <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
                          <Text style={styles.gridStatText}>{devotional.comments_count}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          // Prayers List
          <View style={styles.section}>
            {/* Prayer Filter Button */}
            <View style={styles.prayerFilterHeader}>
              <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
                Showing: {prayerFilter}
              </Text>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => setShowPrayerFilterMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Filter prayers"
              >
                <Ionicons name="filter-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {(() => {
              const filteredPrayers = prayers.filter((prayer) =>
                prayerFilter === 'Praying' ? !prayer.is_answered : prayer.is_answered
              );

              return filteredPrayers.length === 0 ? (
                <Card>
                  <View style={styles.emptySection}>
                    <Ionicons name="hand-left-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
                      {prayerFilter === 'Praying'
                        ? 'No active prayer requests'
                        : 'No answered prayers yet'}
                    </Text>
                  </View>
                </Card>
              ) : (
                filteredPrayers.map((prayer) => (
                <Card key={prayer.id} style={styles.prayerCard}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.prayerTitleRow}>
                      <Text style={[styles.prayerTitle, { color: colors.text }]}>
                        {prayer.title}
                      </Text>
                      {prayer.is_answered ? (
                        <View style={[styles.answeredBadge, { backgroundColor: '#4CAF50' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                          <Text style={styles.answeredText}>Answered</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.prayingBadge,
                            { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                          ]}
                        >
                          <Ionicons name="heart" size={14} color="#FFFFFF" />
                          <Text style={styles.prayingText}>Praying</Text>
                        </View>
                      )}
                    </View>
                    {prayer.content && (
                      <Text
                        style={[styles.prayerContent, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {prayer.content}
                      </Text>
                    )}
                  </View>
                  <View style={styles.prayerFooter}>
                    <View style={styles.prayerMeta}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                        {formatDate(prayer.created_at || '')}
                      </Text>
                    </View>
                    {prayer.prayer_count > 0 && (
                      <View style={styles.prayerCount}>
                        <Ionicons name="heart" size={14} color="#E57373" />
                        <Text style={[styles.prayerCountText, { color: colors.textMuted }]}>
                          {prayer.prayer_count} prayed
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
                ))
              );
            })()}
          </View>
        )}
      </ScrollView>

      {/* Prayer Filter Menu Modal */}
      <Modal
        visible={showPrayerFilterMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrayerFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.filterMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowPrayerFilterMenu(false)}
        >
          <View style={[styles.filterMenuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setPrayerFilter('Praying');
                setShowPrayerFilterMenu(false);
              }}
            >
              <View style={styles.filterMenuItemContent}>
                <Ionicons name="heart" size={20} color={isDark ? '#3D5A50' : colors.primary} />
                <Text style={[styles.filterMenuItemText, { color: colors.text }]}>
                  Praying
                </Text>
              </View>
              {prayerFilter === 'Praying' && (
                <Ionicons name="checkmark" size={20} color={isDark ? '#3D5A50' : colors.primary} />
              )}
            </TouchableOpacity>

            <View style={[styles.filterMenuDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setPrayerFilter('Answered');
                setShowPrayerFilterMenu(false);
              }}
            >
              <View style={styles.filterMenuItemContent}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.filterMenuItemText, { color: colors.text }]}>
                  Answered
                </Text>
              </View>
              {prayerFilter === 'Answered' && (
                <Ionicons name="checkmark" size={20} color={isDark ? '#3D5A50' : colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
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
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  iconRow: {
    marginBottom: 8,
  },
  toggleContainer: {
    marginBottom: 20,
  },
  gridSection: {
    flex: 1,
  },
  emptyGridState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E7E2',
  },
  gridOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  prayerFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterMenuContainer: {
    width: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  filterMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterMenuDivider: {
    height: 1,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptySectionText: {
    fontSize: 14,
  },
  prayerCard: {
    marginBottom: 12,
  },
  prayerHeader: {
    marginBottom: 12,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answeredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prayingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prayerContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  prayerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDate: {
    fontSize: 12,
  },
  prayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prayerCountText: {
    fontSize: 12,
  },
});
