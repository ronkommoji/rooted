import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermissions,
  scheduleDevotionalReminder,
  cancelDevotionalReminders,
  sendPrayerNotification,
  scheduleEventNotifications,
  cancelEventNotifications as cancelEventNotificationsLib,
  NotificationData,
} from '../lib/notifications';

/**
 * Hook to manage notifications based on user preferences
 */
export function useNotifications() {
  const { preferences, session } = useAppStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Handle notification received while app is in foreground
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // Handle notification tap
      handleNotificationTap(response.notification.request.content.data as NotificationData);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Update notifications when preferences change
  useEffect(() => {
    if (session && preferences) {
      updateNotificationSettings();
    }
  }, [
    preferences?.devotional_reminders, 
    preferences?.devotional_reminder_hour,
    preferences?.devotional_reminder_minute,
    preferences?.prayer_notifications, 
    preferences?.event_alerts, 
    session
  ]);

  const initializeNotifications = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
    }
  };

  const updateNotificationSettings = async () => {
    if (!preferences) return;

    // Handle devotional reminders
    if (preferences.devotional_reminders) {
      // Schedule daily reminder at user's preferred time (default 7 AM)
      const hour = preferences.devotional_reminder_hour ?? 7;
      const minute = preferences.devotional_reminder_minute ?? 0;
      await scheduleDevotionalReminder(hour, minute);
    } else {
      await cancelDevotionalReminders();
    }

    // Prayer and event notifications are sent on-demand
    // They respect the preferences when being sent
  };

  const handleNotificationTap = (data: NotificationData) => {
    // Navigation will be handled in App.tsx via the navigation ref
    // This is just for logging/debugging
    console.log('Notification tapped:', data);
  };

  return {
    sendPrayerNotification: async (title: string, body: string, prayerId: string) => {
      // Default to true if preferences not loaded yet
      if (preferences?.prayer_notifications !== false) {
        await sendPrayerNotification(title, body, prayerId);
      }
    },
    scheduleEventNotifications: async (
      eventId: string,
      eventTitle: string,
      eventDate: Date,
      eventLocation?: string
    ) => {
      // Default to true if preferences not loaded yet
      if (preferences?.event_alerts !== false) {
        await scheduleEventNotifications(eventId, eventTitle, eventDate, eventLocation);
      }
    },
    cancelEventNotifications: async (eventId: string) => {
      await cancelEventNotificationsLib(eventId);
    },
  };
}

