/**
 * CreateEventModal Component
 *
 * Modal for creating a new group event with date/time selection.
 * Extracted from HomeScreen to improve code organization.
 *
 * Features:
 * - Date and time pickers
 * - Location and address fields
 * - Notes field
 * - Form validation
 * - Push notifications to group members
 * - Local event reminders
 * - Loading state during submission
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Input } from '../../../components';
import { supabase } from '../../../lib/supabase';
import { sendPushNotification } from '../../../lib/notifications';

export interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  currentGroupId?: string;
  currentUserId?: string;
  scheduleEventNotifications: (
    eventId: string,
    title: string,
    date: Date,
    location?: string
  ) => Promise<void>;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onEventCreated,
  currentGroupId,
  currentUserId,
  scheduleEventNotifications,
}) => {
  const { colors, isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!currentGroupId || !currentUserId) {
      Alert.alert('Error', 'Group or user information missing');
      return;
    }

    setCreating(true);
    try {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          group_id: currentGroupId,
          created_by: currentUserId,
          title: title.trim(),
          event_date: date.toISOString(),
          location: location.trim() || null,
          address: address.trim() || null,
          description: notes.trim() || null,
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
        .eq('group_id', currentGroupId);

      if (groupMembers) {
        const userIds = groupMembers.map((m) => m.user_id);
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id, event_alerts')
          .in('user_id', userIds);

        const notifications = groupMembers
          .filter((member) => {
            const userPrefs = preferences?.find((p) => p.user_id === member.user_id);
            return userPrefs?.event_alerts !== false;
          })
          .map((member) =>
            sendPushNotification(
              member.user_id,
              'New Meeting 📅',
              `${newEvent.title}${
                newEvent.event_date
                  ? ` on ${format(parseISO(newEvent.event_date), 'MMM d, yyyy')}`
                  : ''
              }`,
              {
                type: 'event',
                id: newEvent.id,
              }
            )
          );

        await Promise.all(notifications);
      }

      // Reset form
      setTitle('');
      setDate(new Date());
      setLocation('');
      setAddress('');
      setNotes('');
      setShowDatePicker(false);
      setShowTimePicker(false);
      onClose();
      onEventCreated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setTitle('');
      setDate(new Date());
      setLocation('');
      setAddress('');
      setNotes('');
      setShowDatePicker(false);
      setShowTimePicker(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity onPress={handleClose} disabled={creating}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Event</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.createForm} showsVerticalScrollIndicator={false}>
            <Input
              label="Event Title"
              placeholder="e.g., Weekly Bible Study"
              value={title}
              onChangeText={setTitle}
              editable={!creating}
            />

            <View style={styles.dateTimeSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    {
                      backgroundColor: showDatePicker
                        ? isDark
                          ? '#3D5A50'
                          : colors.primary
                        : colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    setShowDatePicker(true);
                    setShowTimePicker(false);
                  }}
                  disabled={creating}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={showDatePicker ? '#FFFFFF' : isDark ? '#3D5A50' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.dateTimeText,
                      { color: showDatePicker ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {format(date, 'MMM d, yyyy')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    {
                      backgroundColor: showTimePicker
                        ? isDark
                          ? '#3D5A50'
                          : colors.primary
                        : colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    setShowTimePicker(true);
                    setShowDatePicker(false);
                  }}
                  disabled={creating}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={showTimePicker ? '#FFFFFF' : isDark ? '#3D5A50' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.dateTimeText,
                      { color: showTimePicker ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {format(date, 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              </View>
            )}

            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowTimePicker(false);
                    }
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              </View>
            )}

            <Input
              label="Location"
              placeholder="e.g., John's House, Coffee Shop"
              value={location}
              onChangeText={setLocation}
              editable={!creating}
            />

            <Input
              label="Address (optional)"
              placeholder="e.g., 123 Main St, City"
              value={address}
              onChangeText={setAddress}
              editable={!creating}
            />

            <Input
              label="Notes (optional)"
              placeholder="Any additional details..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!creating}
            />

            <Button
              title="Create Event"
              onPress={handleSubmit}
              loading={creating}
              fullWidth
              style={{ marginTop: 8, marginBottom: 40 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
});
