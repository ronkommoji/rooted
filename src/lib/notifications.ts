import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { format, addDays, isBefore, differenceInHours, startOfDay, isSameDay, subDays } from 'date-fns';
import { supabase, supabaseUrl } from './supabase';

// Configure notification behavior with conditional logic for devotional reminders
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if this is a devotional reminder
    const data = notification.request.content.data as NotificationData;
    
    if (data?.type === 'devotional') {
      // Check if user has already posted devotional today
      // Note: This check happens when notification is received, not when scheduled
      // We can't prevent the notification from showing, but we can handle it gracefully
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          const userId = sessionData.session.user.id;
          const today = format(new Date(), 'yyyy-MM-dd');
          
          // Get user's current group
          const { data: membership } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .limit(1)
            .single();
          
          if (membership?.group_id) {
            // Check if user has posted today
            const { data: devotional } = await supabase
              .from('devotionals')
              .select('id')
              .eq('group_id', membership.group_id)
              .eq('user_id', userId)
              .eq('post_date', today)
              .single();
            
            // If user has already posted, still show notification but with reduced priority
            // (We can't prevent it from showing after it's scheduled)
            if (devotional) {
              return {
                shouldShowBanner: false, // Don't show banner if already posted
                shouldShowList: true, // Still show in notification list
                shouldPlaySound: false, // Don't play sound
                shouldSetBadge: false, // Don't set badge
              };
            }
          }
        }
      } catch (error) {
        console.error('Error checking devotional status in notification handler:', error);
        // On error, show notification normally
      }
    }
    
    // Default behavior for all other notifications
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export interface NotificationData {
  type: 'prayer' | 'devotional' | 'event' | 'prayer_reminder' | 'smart_followup' | 'smart_missed';
  screen?: string;
  id?: string;
  [key: string]: any;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus, ios } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    // For iOS, check the ios.status field
    if (Platform.OS === 'ios') {
      const { ios: iosStatus } = await Notifications.getPermissionsAsync();
      if (iosStatus?.status) {
        const iosAuthStatus = iosStatus.status;
        if (
          iosAuthStatus === Notifications.IosAuthorizationStatus.DENIED ||
          iosAuthStatus === Notifications.IosAuthorizationStatus.NOT_DETERMINED
        ) {
          console.warn('iOS notification permissions not granted');
          return false;
        }
      }
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3D5A50',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule multiple daily devotional reminders
 * Accepts array of {hour, minute} objects for up to 3 reminders
 */
export async function scheduleDevotionalReminders(
  reminderTimes: Array<{ hour: number; minute: number }>
): Promise<string[]> {
  try {
    // Cancel any existing devotional reminders
    await cancelDevotionalReminders();

    const identifiers: string[] = [];

    // Schedule up to 3 reminders
    for (let i = 0; i < Math.min(reminderTimes.length, 3); i++) {
      const { hour, minute } = reminderTimes[i];
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for Your Devotional 🌱',
          body: 'Make sure you spend your time in God\'s Word and share with your group members!',
          sound: true,
          data: {
            type: 'devotional',
            screen: 'Devotionals',
            reminderIndex: i + 1,
          } as NotificationData,
        },
        trigger: {
          type: 'daily',
          hour,
          minute,
          repeats: true,
        },
      });

      identifiers.push(identifier);
    }

    return identifiers;
  } catch (error) {
    console.error('Error scheduling devotional reminders:', error);
    return [];
  }
}

/**
 * Schedule a single daily devotional reminder (backward compatibility)
 * Default time: 7:00 AM
 */
export async function scheduleDevotionalReminder(
  hour: number = 7,
  minute: number = 0
): Promise<string | null> {
  const identifiers = await scheduleDevotionalReminders([{ hour, minute }]);
  return identifiers[0] || null;
}

/**
 * Cancel all devotional reminder notifications
 */
export async function cancelDevotionalReminders(): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const devotionalNotifications = allNotifications.filter(
      (notif) => notif.content.data?.type === 'devotional'
    );

    await Promise.all(
      devotionalNotifications.map((notif) =>
        Notifications.cancelScheduledNotificationAsync(notif.identifier)
      )
    );
  } catch (error) {
    console.error('Error canceling devotional reminders:', error);
  }
}

/**
 * Schedule a daily prayer reminder
 * Default time: 8:00 PM (20:00)
 */
export async function schedulePrayerReminder(
  hour: number = 20,
  minute: number = 0
): Promise<string | null> {
  try {
    // Cancel any existing prayer reminders
    await cancelPrayerReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Pray 🙏',
        body: 'Take a moment to pray for your group members and their prayer requests.',
        sound: true,
        data: {
          type: 'prayer_reminder',
          screen: 'Prayers',
        } as NotificationData,
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling prayer reminder:', error);
    return null;
  }
}

/**
 * Cancel all prayer reminder notifications
 */
export async function cancelPrayerReminders(): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const prayerReminderNotifications = allNotifications.filter(
      (notif) => notif.content.data?.type === 'prayer_reminder'
    );

    await Promise.all(
      prayerReminderNotifications.map((notif) =>
        Notifications.cancelScheduledNotificationAsync(notif.identifier)
      )
    );
  } catch (error) {
    console.error('Error canceling prayer reminders:', error);
  }
}

/**
 * Send a prayer update notification
 */
export async function sendPrayerNotification(
  title: string,
  body: string,
  prayerId: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: {
          type: 'prayer',
          screen: 'Prayers',
          id: prayerId,
        } as NotificationData,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending prayer notification:', error);
  }
}

/**
 * Schedule event notifications
 */
export async function scheduleEventNotifications(
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  eventLocation?: string
): Promise<void> {
  try {
    // Cancel any existing notifications for this event
    await cancelEventNotifications(eventId);

    const now = new Date();
    const hoursUntilEvent = differenceInHours(eventDate, now);

    // Notification 1: 24 hours before event
    if (hoursUntilEvent >= 24) {
      const reminderDate = new Date(eventDate);
      reminderDate.setHours(reminderDate.getHours() - 24);

      if (isBefore(now, reminderDate)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Event Reminder 📅',
            body: `${eventTitle} is tomorrow${eventLocation ? ` at ${eventLocation}` : ''}`,
            sound: true,
            data: {
              type: 'event',
              screen: 'Events',
              id: eventId,
            } as NotificationData,
          },
          trigger: {
            type: 'date',
            date: reminderDate,
          },
        });
      }
    }

    // Notification 2: 1 hour before event
    if (hoursUntilEvent >= 1) {
      const reminderDate = new Date(eventDate);
      reminderDate.setHours(reminderDate.getHours() - 1);

      if (isBefore(now, reminderDate)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Event Starting Soon ⏰',
            body: `${eventTitle} starts in 1 hour${eventLocation ? ` at ${eventLocation}` : ''}`,
            sound: true,
            data: {
              type: 'event',
              screen: 'Events',
              id: eventId,
            } as NotificationData,
          },
          trigger: {
            type: 'date',
            date: reminderDate,
          },
        });
      }
    }

    // Notification 3: Day of event (morning reminder)
    // Schedule for 8 AM on the day of the event, or event time if event is before 8 AM
    const eventDay = new Date(eventDate);
    const eventDayStart = startOfDay(eventDay);
    const reminderTime = new Date(eventDayStart);
    
    // If event is before 8 AM, notify at event time; otherwise notify at 8 AM
    if (eventDate.getHours() < 8) {
      reminderTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
    } else {
      reminderTime.setHours(8, 0, 0, 0);
    }
    
    // Only schedule if the reminder time is in the future and event hasn't passed
    const isEventInFuture = isBefore(now, eventDate);
    const isReminderInFuture = isBefore(now, reminderTime);
    
    if (isEventInFuture && isReminderInFuture) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Event Today 📅',
          body: `${eventTitle} is today${eventDate ? ` at ${format(eventDate, 'h:mm a')}` : ''}${eventLocation ? ` at ${eventLocation}` : ''}`,
          sound: true,
          data: {
            type: 'event',
            screen: 'Events',
            id: eventId,
          } as NotificationData,
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        },
      });
    }

    // Note: "When event is created" notification is handled via push notification
    // in EventsScreen.tsx, not as a local scheduled notification
  } catch (error) {
    console.error('Error scheduling event notifications:', error);
  }
}

/**
 * Cancel all notifications for a specific event
 */
export async function cancelEventNotifications(eventId: string): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const eventNotifications = allNotifications.filter(
      (notif) => notif.content.data?.type === 'event' && notif.content.data?.id === eventId
    );

    await Promise.all(
      eventNotifications.map((notif) =>
        Notifications.cancelScheduledNotificationAsync(notif.identifier)
      )
    );
  } catch (error) {
    console.error('Error canceling event notifications:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Register for push notifications and store token in database
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.warn('Push notifications are only supported on physical devices');
      return null;
    }

    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Get project ID from Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('Project ID not found in Constants');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    // Store token in database
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceId = Device.modelName || Device.deviceName || 'unknown';

    // Check if token already exists for this user/platform/device combination
    const { data: existingToken } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('device_id', deviceId)
      .single();

    if (existingToken) {
      // Update existing token if it changed
      if (existingToken.token !== token) {
        const { error } = await supabase
          .from('push_tokens')
          .update({
            token,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('Error updating push token:', error);
          return null;
        }
      }
    } else {
      // Insert new token
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: userId,
          token,
          platform,
          device_id: deviceId,
        });

      if (error) {
        console.error('Error storing push token:', error);
        return null;
      }
    }

    console.log('Push token registered successfully');
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Send push notification to a user via Supabase Edge Function
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('No session found, cannot send push notification');
      return;
    }

    console.log('Sending push notification:', { userId, title, body });

    // Edge Function now has verify_jwt: false, so we don't need auth header
    // But we can still include it for logging/security
    // Import supabaseUrl from supabase config instead of hardcoding
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Optional: Include auth header for logging (Edge Function doesn't require it now)
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          body,
          data: data || {},
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error sending push notification:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        userId,
        title,
      });
      return;
    }

    const result = await response.json();
    console.log('✅ Push notification sent successfully:', result);
  } catch (error: any) {
    console.error('❌ Error calling push notification function:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
  }
}

/**
 * Check if user has completed devotional today and schedule follow-up reminder if not
 * This is called daily at 2 PM to check completion status
 */
export async function checkAndScheduleFollowUpReminder(userId: string, groupId: string): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Check if user has posted a devotional today
    const { data: devotional } = await supabase
      .from('devotionals')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('post_date', today)
      .single();

    // If no devotional posted, schedule a follow-up reminder for 6 PM
    if (!devotional) {
      const now = new Date();
      const followUpTime = new Date();
      followUpTime.setHours(18, 0, 0, 0); // 6 PM

      // Only schedule if 6 PM hasn't passed yet today
      if (isBefore(now, followUpTime)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Don\'t Forget Your Devotional 🌱',
            body: 'You haven\'t completed your devotional today. Take a moment to spend time with God!',
            sound: true,
            data: {
              type: 'smart_followup',
              screen: 'Devotionals',
            } as NotificationData,
          },
          trigger: {
            type: 'date',
            date: followUpTime,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error checking and scheduling follow-up reminder:', error);
  }
}

/**
 * Check if user has missed posting devotionals for 2+ days and send reminder
 * This is called daily at 9 AM
 */
export async function checkMissedDaysAndNotify(userId: string, groupId: string): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
    
    // Check if user has posted in the last 2 days
    const { data: recentDevotionals } = await supabase
      .from('devotionals')
      .select('post_date')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .gte('post_date', twoDaysAgo)
      .order('post_date', { ascending: false })
      .limit(1);

    // If no devotional in last 2 days, send encouraging reminder
    if (!recentDevotionals || recentDevotionals.length === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'We Miss You! 🌱',
          body: 'It\'s been a few days since your last devotional. Your group is here to support you!',
          sound: true,
          data: {
            type: 'smart_missed',
            screen: 'Devotionals',
          } as NotificationData,
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.error('Error checking missed days and notifying:', error);
  }
}

/**
 * Schedule smart notification checks
 * - Follow-up check at 2 PM daily
 * - Missed days check at 9 AM daily
 */
export async function scheduleSmartNotifications(userId: string, groupId: string): Promise<void> {
  try {
    // Cancel existing smart notification schedulers
    await cancelSmartNotifications();

    const now = new Date();
    
    // Schedule follow-up check at 2 PM daily
    const followUpCheckTime = new Date();
    followUpCheckTime.setHours(14, 0, 0, 0); // 2 PM
    
    // If 2 PM has passed today, schedule for tomorrow
    if (!isBefore(now, followUpCheckTime)) {
      followUpCheckTime.setDate(followUpCheckTime.getDate() + 1);
    }

    // Schedule daily check at 2 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '', // Empty title - this is just a trigger
        body: '',
        data: {
          type: 'smart_followup',
          action: 'check',
          userId,
          groupId,
        } as NotificationData,
      },
      trigger: {
        type: 'daily',
        hour: 14,
        minute: 0,
        repeats: true,
      },
    });

    // Schedule missed days check at 9 AM daily
    const missedCheckTime = new Date();
    missedCheckTime.setHours(9, 0, 0, 0); // 9 AM
    
    // If 9 AM has passed today, schedule for tomorrow
    if (!isBefore(now, missedCheckTime)) {
      missedCheckTime.setDate(missedCheckTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '', // Empty title - this is just a trigger
        body: '',
        data: {
          type: 'smart_missed',
          action: 'check',
          userId,
          groupId,
        } as NotificationData,
      },
      trigger: {
        type: 'daily',
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('Error scheduling smart notifications:', error);
  }
}

/**
 * Cancel all smart notification schedulers
 */
export async function cancelSmartNotifications(): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const smartNotifications = allNotifications.filter(
      (notif) => 
        (notif.content.data?.type === 'smart_followup' || notif.content.data?.type === 'smart_missed') &&
        notif.content.data?.action === 'check'
    );

    await Promise.all(
      smartNotifications.map((notif) =>
        Notifications.cancelScheduledNotificationAsync(notif.identifier)
      )
    );
  } catch (error) {
    console.error('Error canceling smart notifications:', error);
  }
}
