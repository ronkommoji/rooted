import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Header, PillToggle, Button, Input, EmptyState } from '../../components';
import { EventCard, EventWithRsvps, Attendee } from './components/EventCard';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types/database';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotifications } from '../../hooks/useNotifications';
import { sendPushNotification } from '../../lib/notifications';

export const EventsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { currentGroup, session } = useAppStore();
  const { scheduleEventNotifications, cancelEventNotifications } = useNotifications();
  
  const [filter, setFilter] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [events, setEvents] = useState<EventWithRsvps[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pastEventsCount, setPastEventsCount] = useState(0);
  
  // Create event state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit event state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithRsvps | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventAddress, setEditEventAddress] = useState('');
  const [editEventNotes, setEditEventNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Menu state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRsvps | null>(null);

  // Attendee list state
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({});
  const [loadingAttendees, setLoadingAttendees] = useState<Record<string, boolean>>({});

  const fetchEvents = useCallback(async () => {
    if (!currentGroup?.id || !session?.user?.id) return;

    const now = new Date().toISOString();
    let query = supabase
      .from('events')
      .select('*')
      .eq('group_id', currentGroup.id)
      .order('event_date', { ascending: filter === 'Upcoming' });

    if (filter === 'Upcoming') {
      query = query.gte('event_date', now);
    } else {
      query = query.lt('event_date', now);
    }

    const { data: eventsData, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    // Fetch RSVPs for each event
    const eventsWithRsvps = await Promise.all(
      (eventsData || []).map(async (event) => {
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('status, user_id')
          .eq('event_id', event.id);

        const counts = { yes: 0, no: 0 };
        let userRsvp: 'yes' | 'no' | null = null;

        rsvps?.forEach((rsvp) => {
          if (rsvp.status === 'yes') counts.yes++;
          if (rsvp.status === 'no') counts.no++;
          if (rsvp.user_id === session.user.id) {
            userRsvp = rsvp.status as 'yes' | 'no';
          }
        });

        return {
          ...event,
          rsvp_counts: counts,
          user_rsvp: userRsvp,
        } as EventWithRsvps;
      })
    );

    setEvents(eventsWithRsvps);
    setLoading(false);
    // Clear expanded state when events change
    setExpandedEventId(null);
    
    // Update past events count if on Past tab
    if (filter === 'Past') {
      setPastEventsCount(eventsWithRsvps.length);
    }
  }, [currentGroup?.id, filter, session?.user?.id]);

  // Fetch past events count separately
  const fetchPastEventsCount = useCallback(async () => {
    if (!currentGroup?.id) return;

    const now = new Date().toISOString();
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', currentGroup.id)
      .lt('event_date', now);

    if (!error) {
      setPastEventsCount(count || 0);
    }
  }, [currentGroup?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchPastEventsCount();
  }, [fetchPastEventsCount]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleRsvp = async (event: EventWithRsvps, status: 'yes' | 'no') => {
    if (!session?.user?.id) return;

    // Optimistic update
    setEvents(prev => prev.map(e => {
      if (e.id === event.id) {
        const oldStatus = e.user_rsvp;
        const newCounts = { ...e.rsvp_counts };
        
        // Remove old count
        if (oldStatus === 'yes') newCounts.yes--;
        if (oldStatus === 'no') newCounts.no--;
        
        // Add new count
        if (status === 'yes') newCounts.yes++;
        if (status === 'no') newCounts.no++;
        
        return { ...e, user_rsvp: status, rsvp_counts: newCounts };
      }
      return e;
    }));

    const { error } = await supabase
      .from('event_rsvps')
      .upsert(
        {
          event_id: event.id,
          user_id: session.user.id,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' }
      );

    if (error) {
      // Revert on error
      fetchEvents();
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!currentGroup?.id || !session?.user?.id) return;

    setCreating(true);
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
        // Get preferences for all members
        const userIds = groupMembers.map(m => m.user_id);
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id, event_alerts')
          .in('user_id', userIds);

        // Send push notification to ALL group members (including creator) with event_alerts enabled
        const notifications = groupMembers
          .filter(member => {
            // Check if user has event_alerts enabled (default to true if not set)
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

      resetCreateModal();
      fetchEvents();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setEventTitle('');
    setEventDate(new Date());
    setEventLocation('');
    setEventAddress('');
    setEventNotes('');
  };

  const handleOpenMenu = (event: EventWithRsvps) => {
    setSelectedEvent(event);
    setShowMenuModal(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    setEditingEvent(selectedEvent);
    setEditEventTitle(selectedEvent.title);
    setEditEventDate(selectedEvent.event_date ? parseISO(selectedEvent.event_date) : new Date());
    setEditEventLocation(selectedEvent.location || '');
    setEditEventAddress(selectedEvent.address || '');
    setEditEventNotes(selectedEvent.description || '');
    setShowMenuModal(false);
    setShowEditModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editEventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!editingEvent || !currentGroup?.id || !session?.user?.id) return;

    setUpdating(true);
    try {
      // Check if date/time changed
      const oldDate = editingEvent.event_date ? parseISO(editingEvent.event_date) : null;
      const newDate = editEventDate;
      const dateChanged = oldDate ? oldDate.getTime() !== newDate.getTime() : false;

      // Cancel old notifications
      await cancelEventNotifications(editingEvent.id);

      const { data: updatedEvent, error } = await supabase
        .from('events')
        .update({
          title: editEventTitle.trim(),
          event_date: editEventDate.toISOString(),
          location: editEventLocation.trim() || null,
          address: editEventAddress.trim() || null,
          description: editEventNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingEvent.id)
        .select()
        .single();

      if (error) throw error;

      // Schedule new notifications with updated event data
      if (updatedEvent && updatedEvent.event_date) {
        await scheduleEventNotifications(
          updatedEvent.id,
          updatedEvent.title,
          parseISO(updatedEvent.event_date),
          updatedEvent.location || undefined
        );
      }

      // If date/time changed, notify all group members
      if (dateChanged) {
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', currentGroup.id);

        if (groupMembers) {
          // Get preferences for all members
          const userIds = groupMembers.map(m => m.user_id);
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('user_id, event_alerts')
            .in('user_id', userIds);

          // Send push notification to each member with event_alerts enabled
          const notifications = groupMembers
            .filter(member => {
              // Check if user has event_alerts enabled (default to true if not set)
              const userPrefs = preferences?.find(p => p.user_id === member.user_id);
              return userPrefs?.event_alerts !== false;
            })
            .map(member =>
              sendPushNotification(
                member.user_id,
                'Event Updated 🔄',
                `${updatedEvent.title} time changed to ${format(parseISO(updatedEvent.event_date!), 'MMM d, yyyy h:mm a')}`,
                {
                  type: 'event',
                  id: updatedEvent.id,
                }
              )
            );

          await Promise.all(notifications);
        }
      }

      resetEditModal();
      fetchEvents();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const resetEditModal = () => {
    setShowEditModal(false);
    setEditingEvent(null);
    setEditEventTitle('');
    setEditEventDate(new Date());
    setEditEventLocation('');
    setEditEventAddress('');
    setEditEventNotes('');
  };

  const fetchAttendees = async (eventId: string) => {
    if (attendees[eventId]) {
      // Already fetched, just toggle
      setExpandedEventId(expandedEventId === eventId ? null : eventId);
      return;
    }

    setLoadingAttendees(prev => ({ ...prev, [eventId]: true }));
    setExpandedEventId(eventId);

    try {
      const { data: rsvps, error } = await supabase
        .from('event_rsvps')
        .select(`
          user_id,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'yes');

      if (error) throw error;

      const attendeeList: Attendee[] = (rsvps || [])
        .filter((rsvp: any) => rsvp.profiles) // Filter out any null profiles
        .map((rsvp: any) => ({
          user_id: rsvp.user_id,
          full_name: rsvp.profiles.full_name || 'Unknown',
          avatar_url: rsvp.profiles.avatar_url || null,
        }));

      setAttendees(prev => ({ ...prev, [eventId]: attendeeList }));
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoadingAttendees(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const toggleAttendeeList = (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      fetchAttendees(eventId);
    }
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent || !currentGroup?.id || !session?.user?.id) return;

    setShowMenuModal(false);
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const eventTitle = selectedEvent.title;
              
              // Cancel event notifications
              await cancelEventNotifications(selectedEvent.id);

              // Notify all group members before deleting
              const { data: groupMembers } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', currentGroup.id);

              if (groupMembers) {
                // Get preferences for all members
                const userIds = groupMembers.map(m => m.user_id);
                const { data: preferences } = await supabase
                  .from('user_preferences')
                  .select('user_id, event_alerts')
                  .in('user_id', userIds);

                // Send push notification to each member with event_alerts enabled
                const notifications = groupMembers
                  .filter(member => {
                    // Check if user has event_alerts enabled (default to true if not set)
                    const userPrefs = preferences?.find(p => p.user_id === member.user_id);
                    return userPrefs?.event_alerts !== false;
                  })
                  .map(member =>
                    sendPushNotification(
                      member.user_id,
                      'Event Cancelled 🗑️',
                      `${eventTitle} has been cancelled`,
                      {
                        type: 'event',
                        id: selectedEvent.id,
                      }
                    )
                  );

                await Promise.all(notifications);
              }

              // Delete RSVPs first
              await supabase
                .from('event_rsvps')
                .delete()
                .eq('event_id', selectedEvent.id);

              // Delete the event
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', selectedEvent.id);

              if (error) throw error;

              fetchEvents();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const renderEventCard = ({ item: event }: { item: EventWithRsvps }) => {
    const isOwnEvent = event.created_by === session?.user?.id;
    const canEditEvent = !!currentGroup && !!session && !!event.group_id;

    return (
      <EventCard
        event={event}
        onRsvp={handleRsvp}
        onMenuPress={handleOpenMenu}
        onToggleAttendees={toggleAttendeeList}
        expandedEventId={expandedEventId}
        attendees={attendees}
        loadingAttendees={loadingAttendees}
        isCurrentUserCreator={isOwnEvent}
        canEditEvent={canEditEvent}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Events" />
      
      <View style={styles.filterContainer}>
        <PillToggle
          options={['Upcoming', 'Past']}
          selected={filter}
          onSelect={(option) => setFilter(option as 'Upcoming' | 'Past')}
        />
        {filter === 'Past' && pastEventsCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {pastEventsCount} past {pastEventsCount === 1 ? 'event' : 'events'}
            </Text>
          </View>
        )}
      </View>

      <FlashList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        estimatedItemSize={300}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="calendar"
              title={filter === 'Upcoming' ? 'No Upcoming Events' : 'No Past Events'}
              message={
                filter === 'Upcoming'
                  ? 'Plan your next group gathering!'
                  : 'Your past events will appear here'
              }
              actionLabel={filter === 'Upcoming' ? 'Create Event' : undefined}
              onAction={filter === 'Upcoming' ? () => setShowCreateModal(true) : undefined}
            />
          ) : null
        }
      />

      {filter === 'Upcoming' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: isDark ? '#3D5A50' : colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create Event Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={resetCreateModal}>
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

              {/* Date Picker */}
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
                loading={creating}
                fullWidth
                style={{ marginTop: 8, marginBottom: 40 }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={resetEditModal}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Event</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.createForm} showsVerticalScrollIndicator={false}>
              <Input
                label="Event Title"
                placeholder="e.g., Weekly Bible Study"
                value={editEventTitle}
                onChangeText={setEditEventTitle}
              />

              {/* Date Picker */}
              <View style={styles.dateTimeSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date & Time</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[
                      styles.dateTimeButton, 
                      { 
                        backgroundColor: showEditDatePicker ? (isDark ? '#3D5A50' : colors.primary) : colors.card, 
                        borderColor: colors.cardBorder 
                      }
                    ]}
                    onPress={() => {
                      setShowEditDatePicker(true);
                      setShowEditTimePicker(false);
                    }}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={showEditDatePicker ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary)} 
                    />
                    <Text style={[
                      styles.dateTimeText, 
                      { color: showEditDatePicker ? '#FFFFFF' : colors.text }
                    ]}>
                      {format(editEventDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.dateTimeButton, 
                      { 
                        backgroundColor: showEditTimePicker ? (isDark ? '#3D5A50' : colors.primary) : colors.card, 
                        borderColor: colors.cardBorder 
                      }
                    ]}
                    onPress={() => {
                      setShowEditTimePicker(true);
                      setShowEditDatePicker(false);
                    }}
                  >
                    <Ionicons 
                      name="time-outline" 
                      size={18} 
                      color={showEditTimePicker ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary)} 
                    />
                    <Text style={[
                      styles.dateTimeText, 
                      { color: showEditTimePicker ? '#FFFFFF' : colors.text }
                    ]}>
                      {format(editEventDate, 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showEditDatePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={editEventDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowEditDatePicker(false);
                      }
                      if (date) setEditEventDate(date);
                    }}
                  />
                </View>
              )}

              {showEditTimePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={editEventDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowEditTimePicker(false);
                      }
                      if (date) setEditEventDate(date);
                    }}
                  />
                </View>
              )}

              <Input
                label="Location"
                placeholder="e.g., John's House, Coffee Shop"
                value={editEventLocation}
                onChangeText={setEditEventLocation}
              />

              <Input
                label="Address (optional)"
                placeholder="e.g., 123 Main St, City"
                value={editEventAddress}
                onChangeText={setEditEventAddress}
              />

              <Input
                label="Notes (optional)"
                placeholder="Any additional details..."
                value={editEventNotes}
                onChangeText={setEditEventNotes}
                multiline
                numberOfLines={3}
              />

              <Button
                title="Save Changes"
                onPress={handleUpdateEvent}
                loading={updating}
                fullWidth
                style={{ marginTop: 8, marginBottom: 40 }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditEvent}
            >
              <Ionicons name="pencil-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Edit
              </Text>
            </TouchableOpacity>
            
            {/* Only show delete option for event creator */}
            {selectedEvent?.created_by === session?.user?.id && (
              <>
                <View style={[styles.menuDivider, { backgroundColor: colors.cardBorder }]} />
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDeleteEvent}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                  <Text style={[styles.menuItemText, { color: colors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            <View style={[styles.menuDivider, { backgroundColor: colors.cardBorder }]} />
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenuModal(false)}
            >
              <Ionicons name="close-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Cancel
              </Text>
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  countBadge: {
    alignItems: 'center',
    marginTop: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  createForm: {
    padding: 20,
  },
  dateTimeSection: {
    marginBottom: 16,
  },
  pickerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
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
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  doneButton: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
  },
});
