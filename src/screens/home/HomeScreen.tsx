import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Header, ChallengeCard, ChallengeDetailModal } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentWeekChallenge, WeeklyChallenge } from '../../data/weeklyChallenge';
import { StoryViewerModal, AddDevotionalSheet, DailyDevotionalCard } from '../devotionals/components';
import { useDevotionals } from '../devotionals/hooks';
import { requestDailyDevotionalRefresh } from '../devotionals/hooks/useDailyDevotional';
import { useNotifications } from '../../hooks/useNotifications';
import { useRecentPrayersQuery, useRecentEventsQuery, useEventRsvpsQuery } from '../../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { fetchUserProfile } from '../../lib/profileApi';
import {
  DevotionalSection,
  EventListSection,
  CreatePrayerModal,
  CreateEventModal,
  FABMenu,
  EventWithRsvpCount,
} from './components';
import { useDevotionalsRealtime, usePrayersRealtime, useEventsRealtime } from '../../hooks/useRealtimeSubscription';

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { currentGroup, session, fetchProfile, fetchGroupMembers } = useAppStore();
  const { scheduleEventNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  // Enable realtime subscriptions for all data on home screen
  useDevotionalsRealtime();
  usePrayersRealtime();
  useEventsRealtime();

  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(getCurrentWeekChallenge());

  // Story/Devotional state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerStartMember, setStoryViewerStartMember] = useState('');
  const [showAddDevotional, setShowAddDevotional] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Challenge modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Modal state for extracted components
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Use today's devotionals
  const today = new Date();
  const {
    memberSubmissions,
    storySlides,
    currentUserHasPosted,
    currentUserCompletedDaily,
    loading: loadingDevotionals,
    onRefresh: refreshDevotionals,
    addDevotional,
    addDailyDevotional,
    uploadImage,
  } = useDevotionals(today);

  const currentUserId = session?.user?.id || '';
  const queryClient = useQueryClient();
  const profilePrefetchStarted = useRef(false);

  // React Query hooks for prayers and events
  const {
    data: recentPrayers = [],
    isLoading: loadingPrayers,
    refetch: refetchPrayers,
  } = useRecentPrayersQuery(3);

  const {
    data: upcomingEvents = [],
    isLoading: loadingEvents,
    refetch: refetchEvents,
  } = useRecentEventsQuery(2);

  // Update challenge on mount
  useEffect(() => {
    setWeeklyChallenge(getCurrentWeekChallenge());
  }, []);

  // Prefetch current user's profile in background after first screen has rendered and its queries have run.
  // Delay so Home's devotionals, prayers, events load first; then profile + images load as last step.
  useEffect(() => {
    if (!currentUserId || !currentGroup?.id || profilePrefetchStarted.current) return;

    const delayMs = 3000; // 3s after Home mounts so Home's own queries run first
    const timeoutId = setTimeout(() => {
      profilePrefetchStarted.current = true;
      const key = queryKeys.profile.detail(currentUserId);
      const queryFn = () =>
        fetchUserProfile(currentUserId, currentGroup!.id, currentUserId);

      queryClient
        .fetchQuery({
          queryKey: key,
          queryFn,
          staleTime: 5 * 60 * 1000,
          gcTime: 15 * 60 * 1000,
        })
        .then((data) => {
          // Prefetch profile devotional images so they're cached when user opens Profile
          if (data?.devotionals?.length) {
            data.devotionals.forEach((d) => {
              if (d.image_url?.trim()) {
                Image.prefetch(d.image_url).catch(() => {});
              }
            });
          }
        })
        .catch(() => {});
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [currentUserId, currentGroup?.id, queryClient]);

  // Combined refresh for pull-to-refresh: profile, group members, devotionals, daily devotional, prayers, events
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setWeeklyChallenge(getCurrentWeekChallenge());

    try {
      await Promise.all([
        refetchPrayers(),
        refetchEvents(),
        refreshDevotionals(),
        requestDailyDevotionalRefresh(),
        fetchProfile(),
        currentGroup?.id ? fetchGroupMembers() : Promise.resolve(),
      ]);
      // Invalidate React Query caches so profile/group data stays in sync everywhere
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    } finally {
      setRefreshing(false);
    }
  }, [currentGroup?.id, fetchProfile, fetchGroupMembers, queryClient, refetchPrayers, refetchEvents, refreshDevotionals]);

  const isRefreshing = refreshing || loadingPrayers || loadingEvents || loadingDevotionals;

  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  // Story handlers
  const handleMemberStoryPress = (memberId: string) => {
    setStoryViewerStartMember(memberId);
    setShowStoryViewer(true);
  };

  const handleAddDevotional = async (imageUri: string) => {
    setUploading(true);
    try {
      const imageUrl = await uploadImage(imageUri);
      if (!imageUrl) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }
      await addDevotional(imageUrl);
      setShowAddDevotional(false);
      // Navigate to Devotionals page
      navigation.navigate('Devotionals');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add devotional');
    } finally {
      setUploading(false);
    }
  };

  const handlePrayerCreated = () => {
    refetchPrayers();
    navigation.navigate('Prayers');
  };

  const handleEventCreated = () => {
    refetchEvents();
    navigation.navigate('Events');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header showGroup />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge of the Week */}
        <View style={styles.section}>
          <ChallengeCard
            challenge={weeklyChallenge}
            onPress={() => setShowChallengeModal(true)}
          />
        </View>

        {/* Today's Devotionals - Story Row */}
        <DevotionalSection
          members={memberSubmissions}
          currentUserId={currentUserId}
          currentUserHasPosted={currentUserHasPosted}
          onMemberPress={handleMemberStoryPress}
          onAddPress={() => setShowAddDevotional(true)}
          onSeeAllPress={() => navigation.navigate('Devotionals')}
          loading={loadingDevotionals}
        />

        {/* Daily Devotional */}
        <View style={styles.section}>
          <DailyDevotionalCard />
        </View>

        {/* Recent Prayer Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              PRAYER REQUESTS
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Prayers')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                See All →
              </Text>
            </TouchableOpacity>
          </View>

          {recentPrayers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No prayer requests yet. Be the first to share!
              </Text>
            </Card>
          ) : (
            recentPrayers.map((prayer) => (
              <Card 
                key={prayer.id} 
                style={styles.prayerCard}
                onPress={() => navigation.navigate('Prayers')}
              >
                <View style={styles.prayerHeader}>
                  <Avatar 
                    name={prayer.profiles.full_name}
                    imageUrl={prayer.profiles.avatar_url}
                    size={32}
                    backgroundColor={colors.primary}
                  />
                  <View style={styles.prayerInfo}>
                    <Text style={[styles.prayerTitle, { color: colors.text }]} numberOfLines={1}>
                      {prayer.title}
                    </Text>
                    <Text style={[styles.prayerMeta, { color: colors.textMuted }]}>
                      {prayer.profiles.full_name} · {timeAgo(prayer.created_at || new Date().toISOString())}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Upcoming Events */}
        <EventListSection
          events={upcomingEvents}
          onEventPress={() => navigation.navigate('Events')}
          onSeeAllPress={() => navigation.navigate('Events')}
        />
      </ScrollView>

      {/* Story Viewer Modal */}
      <StoryViewerModal
        visible={showStoryViewer}
        storySlides={storySlides}
        initialMemberId={storyViewerStartMember}
        onClose={() => setShowStoryViewer(false)}
      />

      {/* Add Devotional Sheet */}
      <AddDevotionalSheet
        visible={showAddDevotional}
        onClose={() => setShowAddDevotional(false)}
        onImageSelected={handleAddDevotional}
        onDailyDevotionalComplete={async () => {
          try {
            await addDailyDevotional();
            // Don't close the sheet - let user optionally add photo or click "I'm Done"
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to complete daily devotional');
          }
        }}
        uploading={uploading}
        hasCompletedInAppForDate={currentUserCompletedDaily}
      />

      {/* Challenge Detail Modal */}
      <ChallengeDetailModal
        visible={showChallengeModal}
        challenge={weeklyChallenge}
        onClose={() => setShowChallengeModal(false)}
      />

      {/* Floating Action Button Menu */}
      <FABMenu
        onPrayerPress={() => setShowPrayerModal(true)}
        onEventPress={() => setShowEventModal(true)}
        onDevotionalPress={() => setShowAddDevotional(true)}
      />

      {/* Prayer Creation Modal */}
      <CreatePrayerModal
        visible={showPrayerModal}
        onClose={() => setShowPrayerModal(false)}
        onPrayerCreated={handlePrayerCreated}
        currentGroupId={currentGroup?.id}
        currentUserId={session?.user?.id}
      />

      {/* Event Creation Modal */}
      <CreateEventModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEventCreated={handleEventCreated}
        currentGroupId={currentGroup?.id}
        currentUserId={session?.user?.id}
        scheduleEventNotifications={scheduleEventNotifications}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Prayer card styles
  prayerCard: {
    marginBottom: 12,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prayerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  prayerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
