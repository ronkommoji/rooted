import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Header } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Prayer, Event, Profile } from '../../types/database';
import { getCurrentWeekChallenge, WeeklyChallenge } from '../../data/weeklyChallenge';
import { StoryRow, StoryViewerModal, AddDevotionalSheet } from '../devotionals/components';
import { useDevotionals } from '../devotionals/hooks';

type PrayerWithProfile = Prayer & { profiles: Profile };
type EventWithRsvpCount = Event & { rsvp_count: number };

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { currentGroup, session } = useAppStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(getCurrentWeekChallenge());
  const [recentPrayers, setRecentPrayers] = useState<PrayerWithProfile[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithRsvpCount[]>([]);
  
  // Story/Devotional state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerStartMember, setStoryViewerStartMember] = useState('');
  const [showAddDevotional, setShowAddDevotional] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Use today's devotionals
  const today = new Date();
  const {
    memberSubmissions,
    currentUserHasPosted,
    onRefresh: refreshDevotionals,
    addDevotional,
    uploadImage,
  } = useDevotionals(today);

  const currentUserId = session?.user?.id || '';

  const fetchData = useCallback(async () => {
    if (!currentGroup?.id) return;

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
    const now = new Date().toISOString();
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', currentGroup.id)
      .gte('event_date', now)
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
  }, [currentGroup?.id]);

  useEffect(() => {
    fetchData();
    // Update challenge (in case week changed)
    setWeeklyChallenge(getCurrentWeekChallenge());
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    setWeeklyChallenge(getCurrentWeekChallenge());
    await Promise.all([fetchData(), refreshDevotionals()]);
    setRefreshing(false);
  };

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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add devotional');
    } finally {
      setUploading(false);
    }
  };

  // Soft, neutral colors for the challenge card
  const challengeCardBg = isDark ? '#2C3A37' : '#F8F7F4';
  const challengeBorderColor = isDark ? colors.primary + '60' : colors.primary + '30';
  const scriptureColor = isDark ? '#FDFBF7' : '#3D5A50';
  const referenceColor = isDark ? '#B9D6D2' : '#6B8E7D';
  const challengeTextColor = isDark ? '#B0B0B0' : '#6B6B6B';

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
        {/* Weekly Invitation - Gentle, faith-forward design */}
        <View style={styles.section}>
          <View 
            style={[
              styles.invitationCard, 
              { 
                backgroundColor: challengeCardBg,
                borderColor: challengeBorderColor,
              }
            ]}
          >
            {/* Subtle decorative element */}
            <View style={[styles.decorativeLine, { backgroundColor: colors.primary + '30' }]} />
            
            {/* Scripture */}
            <Text style={[styles.scriptureText, { color: scriptureColor }]}>
              "{weeklyChallenge.scripture}"
            </Text>
            
            {/* Reference */}
            <Text style={[styles.referenceText, { color: referenceColor }]}>
              — {weeklyChallenge.reference}
            </Text>
            
            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: challengeBorderColor }]} />
            
            {/* This week's gentle invitation */}
            <View style={styles.challengeRow}>
              <Ionicons 
                name="leaf-outline" 
                size={16} 
                color={colors.primary} 
                style={styles.leafIcon}
              />
              <Text style={[styles.thisWeekLabel, { color: challengeTextColor }]}>
                This week:
              </Text>
              <Text style={[styles.challengeAction, { color: colors.text }]}>
                {weeklyChallenge.challenge}
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Devotionals - Story Row */}
        {memberSubmissions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Today's Devotionals
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Devotionals')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  See All →
                </Text>
              </TouchableOpacity>
            </View>
            
            <StoryRow
              members={memberSubmissions}
              currentUserId={currentUserId}
              currentUserHasPosted={currentUserHasPosted}
              onMemberPress={handleMemberStoryPress}
              onAddPress={() => setShowAddDevotional(true)}
            />
          </View>
        )}

        {/* Recent Prayer Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Prayer Requests
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Upcoming Events
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Events')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                See All →
              </Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No upcoming events. Plan your next gathering!
              </Text>
            </Card>
          ) : (
            upcomingEvents.map((event) => (
              <Card 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => navigation.navigate('Events')}
              >
                <View style={styles.eventRow}>
                  <View style={[styles.eventDateBox, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.eventMonth, { color: colors.primary }]}>
                      {event.event_date ? format(parseISO(event.event_date), 'MMM').toUpperCase() : '---'}
                    </Text>
                    <Text style={[styles.eventDay, { color: colors.primary }]}>
                      {event.event_date ? format(parseISO(event.event_date), 'd') : '--'}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={styles.eventDetails}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.eventDetailText, { color: colors.textMuted }]}>
                        {event.event_date ? format(parseISO(event.event_date), 'h:mm a') : 'TBD'}
                      </Text>
                      {event.location && (
                        <>
                          <Text style={[styles.eventDot, { color: colors.textMuted }]}>•</Text>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                          <Text style={[styles.eventDetailText, { color: colors.textMuted }]} numberOfLines={1}>
                            {event.location}
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={[styles.eventAttendees, { color: colors.textSecondary }]}>
                      {event.rsvp_count} going
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
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
        uploading={uploading}
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
    marginBottom: 24,
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
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  // Invitation card styles
  invitationCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  decorativeLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 3,
    borderRadius: 2,
  },
  scriptureText: {
    fontSize: 18,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 12,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  leafIcon: {
    marginRight: 6,
  },
  thisWeekLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  challengeAction: {
    fontSize: 14,
    fontWeight: '600',
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
  
  // Event card styles
  eventCard: {
    marginBottom: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonth: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventDetailText: {
    fontSize: 12,
  },
  eventDot: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  eventAttendees: {
    fontSize: 12,
    fontWeight: '500',
  },
});
