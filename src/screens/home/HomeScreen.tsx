import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Header, ChallengeCard, ChallengeDetailModal } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Prayer, Profile } from '../../types/database';
import { getCurrentWeekChallenge, WeeklyChallenge } from '../../data/weeklyChallenge';
import { StoryViewerModal, AddDevotionalSheet, DailyDevotionalCard } from '../devotionals/components';
import { useDevotionals } from '../devotionals/hooks';
import { useNotifications } from '../../hooks/useNotifications';
import {
  DevotionalSection,
  EventListSection,
  CreatePrayerModal,
  CreateEventModal,
  FABMenu,
  EventWithRsvpCount,
} from './components';

type PrayerWithProfile = Prayer & { profiles: Profile };

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { currentGroup, session } = useAppStore();
  const { scheduleEventNotifications } = useNotifications();
  
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(getCurrentWeekChallenge());
  const [recentPrayers, setRecentPrayers] = useState<PrayerWithProfile[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithRsvpCount[]>([]);
  
  // Track when data was last fetched to avoid unnecessary refreshes
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes - refresh if data is older than this
  
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
    currentUserHasPosted,
    onRefresh: refreshDevotionals,
    addDevotional,
    addDailyDevotional,
    uploadImage,
  } = useDevotionals(today);

  const currentUserId = session?.user?.id || '';

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!currentGroup?.id) return;

    // Check if we need to refresh (data is stale or forced)
    const now = Date.now();
    const shouldRefresh = forceRefresh || (now - lastFetchTime.current > CACHE_DURATION_MS);
    
    if (!shouldRefresh && lastFetchTime.current > 0) {
      // Data is still fresh, skip fetch
      return;
    }

    // Fetch recent prayers
    const { data: prayersData } = await supabase
      .from('prayers')
      .select('*, profiles(*)')
      .eq('group_id', currentGroup.id)
      .eq('is_answered', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (prayersData) {
      setRecentPrayers(prayersData as PrayerWithProfile[]);
    }

    // Fetch upcoming events
    const nowISO = new Date().toISOString();
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', currentGroup.id)
      .gte('event_date', nowISO)
      .order('event_date', { ascending: true })
      .limit(2);

    if (eventsData) {
      // Get RSVP counts for each event
      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'yes');
          
          return {
            ...event,
            rsvp_count: count || 0,
          } as EventWithRsvpCount;
        })
      );
      setUpcomingEvents(eventsWithCounts);
    }

    // Update last fetch time
    lastFetchTime.current = now;
  }, [currentGroup?.id]);

  useEffect(() => {
    // Initial load - always fetch
    fetchData(true);
    // Update challenge (in case week changed)
    setWeeklyChallenge(getCurrentWeekChallenge());
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    setWeeklyChallenge(getCurrentWeekChallenge());
    // Force refresh all data
    await Promise.all([fetchData(true), refreshDevotionals()]);
    setRefreshing(false);
  };

  // Smart refresh when screen comes into focus
  // Only refresh if data is stale, otherwise show cached data immediately
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchTime.current > CACHE_DURATION_MS;
      
      // Only refresh if data is stale or never fetched
      if (isStale || lastFetchTime.current === 0) {
        // Background refresh - don't block UI
        fetchData(true);
      }
      
      // Don't force refresh devotionals - they have their own caching
      // They will only refresh if their cache is stale
    }, [fetchData])
  );

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
    fetchData();
    navigation.navigate('Prayers');
  };

  const handleEventCreated = () => {
    fetchData();
    navigation.navigate('Events');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header showGroup />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                    size={32} 
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
        stories={memberSubmissions}
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
            setShowAddDevotional(false);
            // Navigate to Devotionals page
            navigation.navigate('Devotionals');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to complete daily devotional');
          }
        }}
        uploading={uploading}
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
    paddingBottom: 20,
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
