/**
 * EventCard Component
 *
 * Memoized event card component for displaying group events with RSVP functionality.
 * Extracted from EventsScreen to reduce component complexity and improve performance.
 *
 * Features:
 * - React.memo optimization for preventing unnecessary re-renders
 * - RSVP status tracking and visual feedback
 * - Expandable attendee list
 * - Owner-only menu access for edit/delete
 * - Date/time formatting with date-fns
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Card } from '../../../components/Card';
import { Avatar } from '../../../components/Avatar';
import { useTheme } from '../../../theme/ThemeContext';
import { Event } from '../../../types/database';

export type EventWithRsvps = Event & {
  rsvp_counts: { yes: number; no: number };
  user_rsvp: 'yes' | 'no' | null;
};

export type Attendee = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
};

export interface EventCardProps {
  event: EventWithRsvps;
  onRsvp: (event: EventWithRsvps, status: 'yes' | 'no') => Promise<void>;
  onMenuPress: (event: EventWithRsvps) => void;
  onToggleAttendees: (eventId: string) => void;
  expandedEventId: string | null;
  attendees: Record<string, Attendee[]>;
  loadingAttendees: Record<string, boolean>;
  isCurrentUserCreator: boolean;
  canEditEvent: boolean;
  style?: ViewStyle;
}

/**
 * EventCard component - Optimized with React.memo
 *
 * Re-renders only when:
 * - Event data changes (id, title, description, dates, rsvp counts)
 * - Expanded state changes
 * - Attendees list changes
 * - User permissions change
 */
export const EventCard = React.memo<EventCardProps>(
  ({
    event,
    onRsvp,
    onMenuPress,
    onToggleAttendees,
    expandedEventId,
    attendees,
    loadingAttendees,
    canEditEvent,
    style,
  }) => {
    const { colors, isDark } = useTheme();

    const isUserGoing = event.user_rsvp === 'yes';
    const isUserNotGoing = event.user_rsvp === 'no';
    const isExpanded = expandedEventId === event.id;

    return (
      <Card style={[styles.container, style]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {canEditEvent && (
            <TouchableOpacity
              onPress={() => onMenuPress(event)}
              style={styles.menuButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Event Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {event.event_date ? format(parseISO(event.event_date), 'EEEE, MMM d, yyyy') : 'TBD'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {event.event_date ? format(parseISO(event.event_date), 'h:mm a') : 'TBD'}
            </Text>
          </View>

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            </View>
          )}

          {event.address && (
            <View style={styles.detailRow}>
              <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>
                {event.address}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {event.description}
          </Text>
        )}

        {/* Attendance Summary */}
        <View style={[styles.attendanceSummary, { borderTopColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={styles.attendanceCount}
            onPress={() => event.rsvp_counts.yes > 0 && onToggleAttendees(event.id)}
            disabled={event.rsvp_counts.yes === 0}
            activeOpacity={event.rsvp_counts.yes > 0 ? 0.7 : 1}
          >
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.attendanceText, { color: colors.textSecondary }]}>
              {event.rsvp_counts.yes} going
            </Text>
            {event.rsvp_counts.yes > 0 && (
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
                style={styles.chevronIcon}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Expanded Attendee List */}
        {isExpanded && (
          <View style={[styles.attendeeList, { borderTopColor: colors.cardBorder }]}>
            {loadingAttendees[event.id] ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading...
              </Text>
            ) : attendees[event.id] && attendees[event.id].length > 0 ? (
              attendees[event.id].map((attendee) => (
                <View key={attendee.user_id} style={styles.attendeeItem}>
                  <Avatar
                    name={attendee.full_name}
                    imageUrl={attendee.avatar_url}
                    size={32}
                    backgroundColor={colors.primary}
                  />
                  <Text style={[styles.attendeeName, { color: colors.text }]}>
                    {attendee.full_name}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyAttendeesText, { color: colors.textSecondary }]}>
                No attendees yet
              </Text>
            )}
          </View>
        )}

        {/* RSVP Buttons */}
        <View style={styles.rsvpContainer}>
          <Text style={[styles.rsvpLabel, { color: colors.textMuted }]}>Are you going?</Text>
          <View style={styles.rsvpButtons}>
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                { borderColor: isDark ? '#3D5A50' : colors.primary },
                isUserGoing && { backgroundColor: isDark ? '#3D5A50' : colors.primary },
              ]}
              onPress={() => onRsvp(event, 'yes')}
            >
              <Ionicons
                name={isUserGoing ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={18}
                color={isUserGoing ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary)}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: isUserGoing ? '#FFFFFF' : (isDark ? '#3D5A50' : colors.primary) },
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
              onPress={() => onRsvp(event, 'no')}
            >
              <Ionicons
                name={isUserNotGoing ? 'close-circle' : 'close-circle-outline'}
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
  },
  // Custom comparison function for React.memo
  (prevProps, nextProps) => {
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.title === nextProps.event.title &&
      prevProps.event.description === nextProps.event.description &&
      prevProps.event.event_date === nextProps.event.event_date &&
      prevProps.event.location === nextProps.event.location &&
      prevProps.event.address === nextProps.event.address &&
      prevProps.event.user_rsvp === nextProps.event.user_rsvp &&
      prevProps.event.rsvp_counts.yes === nextProps.event.rsvp_counts.yes &&
      prevProps.event.rsvp_counts.no === nextProps.event.rsvp_counts.no &&
      prevProps.expandedEventId === nextProps.expandedEventId &&
      prevProps.loadingAttendees[prevProps.event.id] === nextProps.loadingAttendees[nextProps.event.id] &&
      prevProps.canEditEvent === nextProps.canEditEvent &&
      // Check if attendees array changed for this event
      JSON.stringify(prevProps.attendees[prevProps.event.id]) === JSON.stringify(nextProps.attendees[nextProps.event.id])
    );
  }
);

EventCard.displayName = 'EventCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  attendanceSummary: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  attendanceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    fontSize: 14,
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  attendeeList: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendeeName: {
    fontSize: 14,
    flex: 1,
  },
  emptyAttendeesText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rsvpContainer: {
    marginTop: 16,
  },
  rsvpLabel: {
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
  },
});
