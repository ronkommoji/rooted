import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Header, PillToggle, Button, Input, EmptyState } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types/database';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotifications } from '../../hooks/useNotifications';

type EventWithRsvps = Event & {
  rsvp_counts: { yes: number; no: number };
  user_rsvp: 'yes' | 'no' | null;
};

export const EventsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { currentGroup, session } = useAppStore();
  const { scheduleEventNotifications, cancelEventNotifications } = useNotifications();
  
  const [filter, setFilter] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [events, setEvents] = useState<EventWithRsvps[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
  }, [currentGroup?.id, filter, session?.user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

      // Schedule event notifications
      if (newEvent && newEvent.event_date) {
        await scheduleEventNotifications(
          newEvent.id,
          newEvent.title,
          parseISO(newEvent.event_date),
          newEvent.location || undefined
        );
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

    if (!editingEvent) return;

    setUpdating(true);
    try {
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

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;

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
              // Cancel event notifications
              await cancelEventNotifications(selectedEvent.id);

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
    const isUserGoing = event.user_rsvp === 'yes';
    const isUserNotGoing = event.user_rsvp === 'no';
    const isOwnEvent = event.created_by === session?.user?.id;
    
    return (
      <Card style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {event.title}
          </Text>
          {isOwnEvent && (
            <TouchableOpacity
              onPress={() => handleOpenMenu(event)}
              style={styles.menuButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.eventDetailText, { color: colors.textSecondary }]}>
              {event.event_date ? format(parseISO(event.event_date), 'EEEE, MMM d, yyyy') : 'TBD'}
            </Text>
          </View>
          
          <View style={styles.eventDetailRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.eventDetailText, { color: colors.textSecondary }]}>
              {event.event_date ? format(parseISO(event.event_date), 'h:mm a') : 'TBD'}
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.eventDetailRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.eventDetailText, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            </View>
          )}

          {event.address && (
            <View style={styles.eventDetailRow}>
              <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.eventDetailText, { color: colors.textMuted }]}>
                {event.address}
              </Text>
            </View>
          )}
        </View>

        {event.description && (
          <Text style={[styles.eventNotes, { color: colors.textSecondary }]}>
            {event.description}
          </Text>
        )}

        {/* Attendance Summary */}
        <View style={[styles.attendanceSummary, { borderTopColor: colors.cardBorder }]}>
          <View style={styles.attendanceCount}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.attendanceText, { color: colors.textSecondary }]}>
              {event.rsvp_counts.yes} going
            </Text>
          </View>
        </View>

        {/* RSVP Buttons */}
        <View style={styles.rsvpContainer}>
          <Text style={[styles.rsvpLabel, { color: colors.textMuted }]}>Are you going?</Text>
          <View style={styles.rsvpButtons}>
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                { borderColor: colors.primary },
                isUserGoing && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleRsvp(event, 'yes')}
            >
              <Ionicons 
                name={isUserGoing ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={18} 
                color={isUserGoing ? '#FFFFFF' : colors.primary} 
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: isUserGoing ? '#FFFFFF' : colors.primary },
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rsvpButton,
                { borderColor: colors.error },
                isUserNotGoing && { backgroundColor: colors.error },
              ]}
              onPress={() => handleRsvp(event, 'no')}
            >
              <Ionicons 
                name={isUserNotGoing ? "close-circle" : "close-circle-outline"} 
                size={18} 
                color={isUserNotGoing ? '#FFFFFF' : colors.error} 
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: isUserNotGoing ? '#FFFFFF' : colors.error },
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
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
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
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
          style={[styles.fab, { backgroundColor: colors.primary }]}
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
                    style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      {format(eventDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      {format(eventDate, 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(showDatePicker || showTimePicker) && (
                <DateTimePicker
                  value={eventDate}
                  mode={showDatePicker ? 'date' : 'time'}
                  display="spinner"
                  themeVariant="light"
                  textColor="#000000"
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                    }
                    if (date) setEventDate(date);
                  }}
                />
              )}

              {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
                <TouchableOpacity 
                  style={[styles.doneButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
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
                    style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      {format(editEventDate, 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.dateTimeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => setShowEditTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      {format(editEventDate, 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(showEditDatePicker || showEditTimePicker) && (
                <DateTimePicker
                  value={editEventDate}
                  mode={showEditDatePicker ? 'date' : 'time'}
                  display="spinner"
                  themeVariant="light"
                  textColor="#000000"
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') {
                      setShowEditDatePicker(false);
                      setShowEditTimePicker(false);
                    }
                    if (date) setEditEventDate(date);
                  }}
                />
              )}

              {Platform.OS === 'ios' && (showEditDatePicker || showEditTimePicker) && (
                <TouchableOpacity 
                  style={[styles.doneButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowEditDatePicker(false);
                    setShowEditTimePicker(false);
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  eventCard: {
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
  },
  eventNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    fontStyle: 'italic',
  },
  attendanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  attendanceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  rsvpContainer: {
    marginTop: 12,
  },
  rsvpLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  rsvpButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
