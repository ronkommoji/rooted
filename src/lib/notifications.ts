import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { format, addDays, isBefore, differenceInHours, startOfDay, isSameDay } from 'date-fns';
import { supabase } from './supabase';

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
  type: 'prayer' | 'devotional' | 'event';
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
 * Schedule a daily devotional reminder
 * Default time: 7:00 AM
 */
export async function scheduleDevotionalReminder(
  hour: number = 7,
  minute: number = 0
): Promise<string | null> {
  try {
    // Cancel any existing devotional reminders
    await cancelDevotionalReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for Your Devotional 🌱',
        body: 'Make sure you spend your time in God\'s Word and share with your group members!',
        sound: true,
        data: {
          type: 'devotional',
          screen: 'Devotionals',
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
    console.error('Error scheduling devotional reminder:', error);
    return null;
  }
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
    const supabaseUrl = 'https://bmwyusrojmrlmintpjks.supabase.co';
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
