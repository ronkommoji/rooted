/**
 * Date and time utility functions
 *
 * Centralizes all date formatting and time calculations to eliminate duplicate code
 * across HomeScreen, PrayerWallScreen, DevotionalsScreen, and EventsScreen.
 *
 * Usage:
 *   import { formatDate, timeAgo, formatTime, isToday } from '@/lib/dateUtils';
 *
 *   formatDate(prayer.created_at) // "Jan 15, 2024"
 *   timeAgo(devotional.created_at) // "2h ago"
 *   formatTime(event.start_time) // "3:30 PM"
 */

import { format, formatDistance, isToday as isTodayFns, isPast, isFuture, differenceInDays } from 'date-fns';

/**
 * Format a date as "Jan 15, 2024"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date as "Monday, January 15, 2024"
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    return format(new Date(date), 'EEEE, MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date (long):', error);
    return '';
  }
}

/**
 * Format a time as "3:30 PM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    return format(new Date(date), 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

/**
 * Format a date and time as "Jan 15, 2024 at 3:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    return format(new Date(date), 'MMM d, yyyy \'at\' h:mm a');
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Format as relative time: "2m ago", "3h ago", "5d ago"
 * Falls back to formatted date for old items
 */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();

    // Less than 1 minute
    if (diffMs < 60 * 1000) {
      return 'just now';
    }

    // Less than 1 hour
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    // Less than 24 hours
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Less than 7 days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // Older than 7 days - show formatted date
    return formatDate(date);
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return '';
  }
}

/**
 * Format as relative time using words: "2 minutes ago", "about 3 hours ago"
 */
export function timeAgoLong(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Error calculating time ago (long):', error);
    return '';
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false;

  try {
    return isTodayFns(new Date(date));
  } catch (error) {
    return false;
  }
}

/**
 * Check if a date is in the past
 */
export function isInPast(date: string | Date | null | undefined): boolean {
  if (!date) return false;

  try {
    return isPast(new Date(date));
  } catch (error) {
    return false;
  }
}

/**
 * Check if a date is in the future
 */
export function isInFuture(date: string | Date | null | undefined): boolean {
  if (!date) return false;

  try {
    return isFuture(new Date(date));
  } catch (error) {
    return false;
  }
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  try {
    return Math.abs(differenceInDays(new Date(endDate), new Date(startDate)));
  } catch (error) {
    console.error('Error calculating days between:', error);
    return 0;
  }
}

/**
 * Get the number of days until a date (negative if in the past)
 */
export function daysUntil(date: string | Date | null | undefined): number {
  if (!date) return 0;

  try {
    return differenceInDays(new Date(date), new Date());
  } catch (error) {
    console.error('Error calculating days until:', error);
    return 0;
  }
}

/**
 * Format a date for event cards: "Today at 3:30 PM", "Tomorrow at 3:30 PM", "Jan 15 at 3:30 PM"
 */
export function formatEventDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const eventDate = new Date(date);
    const now = new Date();
    const days = daysUntil(eventDate);

    if (isToday(eventDate)) {
      return `Today at ${formatTime(eventDate)}`;
    } else if (days === 1) {
      return `Tomorrow at ${formatTime(eventDate)}`;
    } else if (days === -1) {
      return `Yesterday at ${formatTime(eventDate)}`;
    } else if (days >= 0 && days < 7) {
      return format(eventDate, 'EEEE \'at\' h:mm a');
    } else {
      return format(eventDate, 'MMM d \'at\' h:mm a');
    }
  } catch (error) {
    console.error('Error formatting event date:', error);
    return '';
  }
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    return format(new Date(date), 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Parse a date string safely
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: string | Date | null | undefined, date2: string | Date | null | undefined): boolean {
  if (!date1 || !date2) return false;

  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch (error) {
    return false;
  }
}
