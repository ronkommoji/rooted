import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import {
  requestNotificationPermissions,
  scheduleDevotionalReminders,
  scheduleDevotionalReminder,
  cancelDevotionalReminders,
  schedulePrayerReminder,
  cancelPrayerReminders,
  scheduleSmartNotifications,
  cancelSmartNotifications,
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
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // Handle notification received while app is in foreground
      console.log('Notification received:', notification);
      
      // For devotional reminders, check if user has already posted
      const data = notification.request.content.data as any;
      if (data?.type === 'devotional' && session?.user?.id) {
        try {
          const { currentGroup } = useAppStore.getState();
          if (currentGroup?.id) {
            const today = new Date().toISOString().split('T')[0];
            const { data: devotional } = await supabase
              .from('devotionals')
              .select('id')
              .eq('group_id', currentGroup.id)
              .eq('user_id', session.user.id)
              .eq('post_date', today)
              .single();
            
            if (devotional) {
              console.log('User has already posted devotional today, notification handled gracefully');
              // Notification handler already prevents banner/sound, so we just log here
            }
          }
        } catch (error) {
          console.error('Error checking devotional status:', error);
        }
      }
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
    preferences?.devotional_reminder_count,
    preferences?.devotional_reminder_time_1_hour,
    preferences?.devotional_reminder_time_1_minute,
    preferences?.devotional_reminder_time_2_hour,
    preferences?.devotional_reminder_time_2_minute,
    preferences?.devotional_reminder_time_3_hour,
    preferences?.devotional_reminder_time_3_minute,
    preferences?.prayer_notifications,
    preferences?.prayer_reminder_enabled,
    preferences?.prayer_reminder_hour,
    preferences?.prayer_reminder_minute,
    preferences?.smart_notifications_enabled,
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
    if (!preferences || !session?.user?.id) return;

    const { currentGroup } = useAppStore.getState();

    // Handle devotional reminders
    if (preferences.devotional_reminders) {
      const reminderCount = preferences.devotional_reminder_count ?? 1;
      const reminderTimes: Array<{ hour: number; minute: number }> = [];

      // Collect reminder times based on count
      for (let i = 1; i <= Math.min(reminderCount, 3); i++) {
        const hourKey = `devotional_reminder_time_${i}_hour` as keyof typeof preferences;
        const minuteKey = `devotional_reminder_time_${i}_minute` as keyof typeof preferences;
        
        const hour = preferences[hourKey] as number | null | undefined;
        const minute = preferences[minuteKey] as number | null | undefined;

        // Use smart defaults if not set
        if (hour !== null && hour !== undefined && minute !== null && minute !== undefined) {
          reminderTimes.push({ hour, minute });
        } else {
          // Smart defaults: 7 AM, 12 PM, 6 PM
          const defaultHours = [7, 12, 18];
          const defaultMinutes = [0, 0, 0];
          reminderTimes.push({
            hour: defaultHours[i - 1] ?? 7,
            minute: defaultMinutes[i - 1] ?? 0,
          });
        }
      }

      // If no times collected, fall back to legacy single reminder
      if (reminderTimes.length === 0) {
        const hour = preferences.devotional_reminder_hour ?? 7;
        const minute = preferences.devotional_reminder_minute ?? 0;
        await scheduleDevotionalReminder(hour, minute);
      } else {
        await scheduleDevotionalReminders(reminderTimes);
      }
    } else {
      await cancelDevotionalReminders();
    }

    // Handle prayer reminders
    if (preferences.prayer_reminder_enabled) {
      const hour = preferences.prayer_reminder_hour ?? 20; // Default 8 PM
      const minute = preferences.prayer_reminder_minute ?? 0;
      await schedulePrayerReminder(hour, minute);
    } else {
      await cancelPrayerReminders();
    }

    // Handle smart notifications
    if (preferences.smart_notifications_enabled && currentGroup?.id) {
      await scheduleSmartNotifications(session.user.id, currentGroup.id);
    } else {
      await cancelSmartNotifications();
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

