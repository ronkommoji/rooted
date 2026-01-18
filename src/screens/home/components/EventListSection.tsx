/**
 * EventListSection Component
 *
 * Displays a list of upcoming events on the home screen.
 * Extracted from HomeScreen to improve code organization.
 *
 * Features:
 * - Displays up to 3 upcoming events with details
 * - Event date box with month and day
 * - Time and location information
 * - RSVP count
 * - "See All" navigation
 * - Empty state message
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../components';
import { Event } from '../../../types/database';

export type EventWithRsvpCount = Event & { rsvp_count: number };

export interface EventListSectionProps {
  events: EventWithRsvpCount[];
  onEventPress: () => void;
  onSeeAllPress: () => void;
}

export const EventListSection: React.FC<EventListSectionProps> = ({
  events,
  onEventPress,
  onSeeAllPress,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          UPCOMING EVENTS
        </Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            See All →
          </Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No upcoming events. Plan your next gathering!
          </Text>
        </Card>
      ) : (
        events.map((event) => (
          <Card
            key={event.id}
            style={styles.eventCard}
            onPress={onEventPress}
          >
            <View style={styles.eventRow}>
              <View
                style={[
                  styles.eventDateBox,
                  { backgroundColor: isDark ? '#3A3A3A' : colors.primary + '15' }
                ]}
              >
                <Text
                  style={[
                    styles.eventMonth,
                    { color: isDark ? colors.text : colors.primary }
                  ]}
                >
                  {event.event_date ? format(parseISO(event.event_date), 'MMM').toUpperCase() : '---'}
                </Text>
                <Text
                  style={[
                    styles.eventDay,
                    { color: isDark ? colors.text : colors.primary }
                  ]}
                >
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
                      <Text
                        style={[styles.eventDetailText, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
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
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventMonth: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventDay: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
  },
  eventDot: {
    fontSize: 10,
    marginHorizontal: 4,
  },
  eventAttendees: {
    fontSize: 12,
  },
});
