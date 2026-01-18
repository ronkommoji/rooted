import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Header, ChallengeCard, ChallengeDetailModal, Button, Input } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Prayer, Event, Profile } from '../../types/database';
import { getCurrentWeekChallenge, WeeklyChallenge } from '../../data/weeklyChallenge';
import { StoryRow, StoryViewerModal, AddDevotionalSheet, DailyDevotionalCard } from '../devotionals/components';
import { useDevotionals } from '../devotionals/hooks';
import { useNotifications } from '../../hooks/useNotifications';
import { sendPushNotification } from '../../lib/notifications';

type PrayerWithProfile = Prayer & { profiles: Profile };
type EventWithRsvpCount = Event & { rsvp_count: number };

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

  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Animation values
  const menuScale = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const button1TranslateY = useRef(new Animated.Value(0)).current;
  const button2TranslateY = useRef(new Animated.Value(0)).current;
  const button3TranslateY = useRef(new Animated.Value(0)).current;
  const button1Opacity = useRef(new Animated.Value(0)).current;
  const button2Opacity = useRef(new Animated.Value(0)).current;
  const button3Opacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Prayer modal state
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [creatingPrayer, setCreatingPrayer] = useState(false);

  // Event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

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

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);

    // Animate backdrop
    Animated.timing(backdropOpacity, {
      toValue: toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate menu buttons
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

  const handleMenuOptionPress = (option: 'prayer' | 'event' | 'devotional') => {
    toggleMenu();
    setTimeout(() => {
      if (option === 'prayer') {
        setShowPrayerModal(true);
      } else if (option === 'event') {
        setShowEventModal(true);
      } else if (option === 'devotional') {
        setShowAddDevotional(true);
      }
    }, 200);
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

  const handleCreatePrayer = async () => {
    if (!prayerTitle.trim()) {
      Alert.alert('Error', 'Please enter a prayer title');
      return;
    }

    if (!currentGroup?.id || !session?.user?.id) return;

    setCreatingPrayer(true);
    try {
      const { error } = await supabase
        .from('prayers')
        .insert({
          group_id: currentGroup.id,
          user_id: session.user.id,
          title: prayerTitle.trim(),
          content: prayerContent.trim() || null,
        });

      if (error) throw error;

      setShowPrayerModal(false);
      setPrayerTitle('');
      setPrayerContent('');
      fetchData();
      // Navigate to Prayers page
      navigation.navigate('Prayers');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prayer request');
    } finally {
      setCreatingPrayer(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!currentGroup?.id || !session?.user?.id) return;

    setCreatingEvent(true);
    try {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          group_id: currentGroup.id,
          created_by: session.user.id,
          title: eventTitle.trim(),
          event_date: eventDate.toISOString(),
          location: eventLocation.trim() || null,
          address: eventAddress.trim() || null,
          description: eventNotes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule event notifications (local reminders)
      if (newEvent && newEvent.event_date) {
        await scheduleEventNotifications(
          newEvent.id,
          newEvent.title,
          parseISO(newEvent.event_date),
          newEvent.location || undefined
        );
      }

      // Send push notifications to all group members with event_alerts enabled
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', currentGroup.id);

      if (groupMembers) {
        const userIds = groupMembers.map(m => m.user_id);
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id, event_alerts')
          .in('user_id', userIds);

        const notifications = groupMembers
          .filter(member => {
            const userPrefs = preferences?.find(p => p.user_id === member.user_id);
            return userPrefs?.event_alerts !== false;
          })
          .map(member =>
            sendPushNotification(
              member.user_id,
              'New Meeting 📅',
              `${newEvent.title}${newEvent.event_date ? ` on ${format(parseISO(newEvent.event_date), 'MMM d, yyyy')}` : ''}`,
              {
                type: 'event',
                id: newEvent.id,
              }
            )
          );

        await Promise.all(notifications);
      }

      setShowEventModal(false);
      setEventTitle('');
      setEventDate(new Date());
      setEventLocation('');
      setEventAddress('');
      setEventNotes('');
      fetchData();
      // Navigate to Events page
      navigation.navigate('Events');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setCreatingEvent(false);
    }
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
        {memberSubmissions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                DEVOTIONALS
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              UPCOMING EVENTS
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
                  <View style={[styles.eventDateBox, { backgroundColor: isDark ? '#3A3A3A' : colors.primary + '15' }]}>
                    <Text style={[styles.eventMonth, { color: isDark ? colors.text : colors.primary }]}>
                      {event.event_date ? format(parseISO(event.event_date), 'MMM').toUpperCase() : '---'}
                    </Text>
                    <Text style={[styles.eventDay, { color: isDark ? colors.text : colors.primary }]}>
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

      {/* Expanding Menu Buttons */}
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
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Prayer Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={() => setShowPrayerModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Prayer Request</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.modalForm}>
              <Input
                label="Prayer Title"
                placeholder="What would you like prayer for?"
                value={prayerTitle}
                onChangeText={setPrayerTitle}
              />

              <Input
                label="Details (optional)"
                placeholder="Share more about your prayer request..."
                value={prayerContent}
                onChangeText={setPrayerContent}
                multiline
                numberOfLines={5}
                containerStyle={{ marginBottom: 24 }}
              />

              <Button
                title="Submit Prayer Request"
                onPress={handleCreatePrayer}
                loading={creatingPrayer}
                fullWidth
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Event Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Event</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.createForm} showsVerticalScrollIndicator={false}>
              <Input
                label="Event Title"
                placeholder="e.g., Weekly Bible Study"
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <View style={styles.dateTimeSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date & Time</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[
                      styles.dateTimeButton, 
                      { 
                        backgroundColor: showDatePicker ? (isDark ? '#3D5A50' : colors.primary) : colors.card, 
                        borderColor: colors.cardBorder 
                      }
                    ]}
                    onPress={() => {
                      setShowDatePicker(true);
                      setShowTimePicker(false);
                    }}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={showDatePicker ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary)} 
                    />
                    <Text style={[
                      styles.dateTimeText, 
                      { color: showDatePicker ? '#FFFFFF' : colors.text }
                    ]}>
                      {format(eventDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.dateTimeButton, 
                      { 
                        backgroundColor: showTimePicker ? (isDark ? '#3D5A50' : colors.primary) : colors.card, 
                        borderColor: colors.cardBorder 
                      }
                    ]}
                    onPress={() => {
                      setShowTimePicker(true);
                      setShowDatePicker(false);
                    }}
                  >
                    <Ionicons 
                      name="time-outline" 
                      size={18} 
                      color={showTimePicker ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary)} 
                    />
                    <Text style={[
                      styles.dateTimeText, 
                      { color: showTimePicker ? '#FFFFFF' : colors.text }
                    ]}>
                      {format(eventDate, 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showDatePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (date) setEventDate(date);
                    }}
                  />
                </View>
              )}

              {showTimePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={eventDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowTimePicker(false);
                      }
                      if (date) setEventDate(date);
                    }}
                  />
                </View>
              )}

              <Input
                label="Location"
                placeholder="e.g., John's House, Coffee Shop"
                value={eventLocation}
                onChangeText={setEventLocation}
              />

              <Input
                label="Address (optional)"
                placeholder="e.g., 123 Main St, City"
                value={eventAddress}
                onChangeText={setEventAddress}
              />

              <Input
                label="Notes (optional)"
                placeholder="Any additional details..."
                value={eventNotes}
                onChangeText={setEventNotes}
                multiline
                numberOfLines={3}
              />

              <Button
                title="Create Event"
                onPress={handleCreateEvent}
                loading={creatingEvent}
                fullWidth
                style={{ marginTop: 8, marginBottom: 40 }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

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
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
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
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  fabMenuButton: {
    position: 'absolute',
    right: 0,
  },
  fabMenuButton1: {
    bottom: 120,
  },
  fabMenuButton2: {
    bottom: 64,
  },
  fabMenuButton3: {
    bottom: 8,
  },
  fabMenuButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: 120,
    justifyContent: 'flex-start',
    height: 44,
  },
  fabMenuButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    flex: 1,
    padding: 20,
  },
  createForm: {
    flex: 1,
    padding: 20,
  },
  dateTimeSection: {
    marginBottom: 24,
  },
  pickerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  doneButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
