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
  registerForPushNotifications,
  NotificationData,
} from '../lib/notifications';

/**
 * Hook to manage notifications based on user preferences
 */
export function useNotifications() {
  const { preferences, session } = useAppStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const tokenListener = useRef<Notifications.EventSubscription>();
  const lastRegisteredToken = useRef<string | null>(null);
  const isInitializing = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Initialize notifications on mount and when session changes
  useEffect(() => {
    if (!session?.user?.id) return;

    userIdRef.current = session.user.id;
    initializeNotifications();

    // Set up notification listener (only for foreground notifications)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Handle notification received while app is in foreground
      console.log('Notification received:', notification);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (tokenListener.current) {
        tokenListener.current.remove();
      }
    };
  }, [session?.user?.id]);

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
    if (!session?.user?.id || isInitializing.current) return;
    
    isInitializing.current = true;
    const userId = session.user.id; // Capture userId for use in callback
    
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return;
      }

      // Register for push notifications (initial registration)
      const token = await registerForPushNotifications(userId);
      if (token) {
        lastRegisteredToken.current = token;
      }

      // Clean up existing listener if any
      if (tokenListener.current) {
        tokenListener.current.remove();
      }

      // Set up push token listener only once
      tokenListener.current = Notifications.addPushTokenListener(async (tokenData) => {
        const newToken = tokenData.data;
        // Only re-register if token actually changed
        if (newToken && newToken !== lastRegisteredToken.current && userIdRef.current) {
          console.log('Push token changed, re-registering...');
          lastRegisteredToken.current = newToken;
          await registerForPushNotifications(userIdRef.current);
        }
      });
    } finally {
      isInitializing.current = false;
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

