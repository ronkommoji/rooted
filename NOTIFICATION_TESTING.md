# 📱 Notification Testing Guide

## Prerequisites

⚠️ **IMPORTANT**: Push notifications **only work on physical devices**, not simulators/emulators.

### Required Setup

1. **Physical iOS Device** (iPhone/iPad)
2. **Development Build** or **Expo Go** (for initial testing)
3. **Two test accounts** in your Supabase database (to test cross-user notifications)
4. **Same group membership** for both test accounts

## Testing Methods

### Method 1: Development Build (Recommended)

This gives you the closest experience to production:

```bash
# Build a development client
eas build --platform ios --profile development

# Install on your device via TestFlight or direct install
# Then run your app with:
npm start
# or
expo start --dev-client
```

### Method 2: Expo Go (Quick Testing)

For quick local testing (limited push notification support):

```bash
npm start
# Scan QR code with Expo Go app
```

**Note**: Expo Go has limitations with push notifications. Use development build for full testing.

## Step-by-Step Testing Checklist

### 1. Test Push Token Registration

**Goal**: Verify push tokens are being stored in the database.

**Steps**:
1. Open the app on a physical device
2. Sign in with a test account
3. Grant notification permissions when prompted
4. Check the console logs for: `"Push token registered successfully"`
5. Verify in Supabase:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = 'your-test-user-id';
   ```
   - Should see a row with `token`, `platform`, and `device_id`

**Expected Result**: Token is stored in `push_tokens` table.

---

### 2. Test Prayer Update Notifications

**Goal**: Verify notifications are sent when someone prays for a user's prayer request.

**Setup**:
- Account A: Create a prayer request
- Account B: Pray for Account A's request

**Steps**:
1. **Account A** (on Device 1):
   - Go to Settings → Notifications
   - Ensure "Prayer Updates" is **enabled**
   - Create a prayer request (e.g., "Please pray for my job interview")

2. **Account B** (on Device 2 or same device with different account):
   - Go to Prayer Wall
   - Find Account A's prayer request
   - Tap "Prayed" button

3. **Account A** (on Device 1):
   - Should receive push notification: "🙏 Someone Prayed for You"
   - Notification should show: "[Account B's name] prayed for '[prayer title]'"
   - Tap notification → Should navigate to Prayer Wall screen

**Expected Result**: 
- ✅ Push notification received on Account A's device
- ✅ Notification content is correct
- ✅ Tapping notification navigates to Prayer Wall

**Test Edge Cases**:
- [ ] Disable "Prayer Updates" in settings → Should NOT receive notification
- [ ] Pray for your own prayer → Should NOT receive notification
- [ ] Test with app in background
- [ ] Test with app closed

---

### 3. Test Devotional Reminders

**Goal**: Verify reminders only show if user hasn't posted, and respect user's time preference.

**Steps**:

#### Test 1: Reminder When Not Posted
1. Go to Settings → Notifications
2. Enable "Devotional Reminders"
3. Set reminder time to **2 minutes from now** (for testing)
   - Change hour/minute in Settings
4. **Don't post a devotional**
5. Wait for notification at scheduled time
6. Should receive: "🌱 Time for Your Devotional"

**Expected Result**: Notification appears with banner, sound, and badge.

#### Test 2: Reminder When Already Posted
1. Post a devotional for today
2. Wait for scheduled reminder time
3. Notification should still appear but:
   - ❌ No banner (silent)
   - ❌ No sound
   - ❌ No badge
   - ✅ Still in notification list

**Expected Result**: Notification is suppressed if user already posted.

#### Test 3: Time Preference
1. Change reminder time in Settings (e.g., 8:00 AM)
2. Verify notification schedules for that time
3. Check scheduled notifications:
   ```javascript
   // Add this temporarily to a screen to debug
   const scheduled = await Notifications.getAllScheduledNotificationsAsync();
   console.log('Scheduled notifications:', scheduled);
   ```

**Expected Result**: Notification scheduled at user's preferred time.

---

### 4. Test Event Alerts

**Goal**: Verify event creation notifications and reminder notifications work correctly.

**Setup**: Two accounts in the same group

**Steps**:

#### Test 1: Event Creation Notification (Push)
1. **Account A** (on Device 1):
   - Go to Settings → Notifications
   - Ensure "Event Alerts" is **enabled**
   - Stay on Events screen

2. **Account B** (on Device 2):
   - Create a new event (e.g., "Bible Study - Tomorrow 7 PM")
   - Set event date to tomorrow

3. **Account A** (on Device 1):
   - Should receive push notification: "📅 New Event Created"
   - Notification shows event title and date
   - Tap notification → Should navigate to Events screen

**Expected Result**: Push notification received when event is created.

#### Test 2: Event Reminder Notifications (Local)
1. **Account A** creates an event:
   - Title: "Test Event"
   - Date: **1 hour from now** (for quick testing)
   - Location: "Test Location"

2. Check scheduled notifications:
   ```javascript
   // Temporarily add to EventsScreen after creating event
   const scheduled = await Notifications.getAllScheduledNotificationsAsync();
   console.log('Event notifications:', scheduled.filter(n => n.content.data?.type === 'event'));
   ```

3. Should see scheduled notifications for:
   - ⏰ 1 hour before event
   - 📅 Day of event (8 AM or event time)

**Expected Result**: Multiple reminder notifications scheduled.

#### Test 3: Day-of-Event Notification
1. Create event for **tomorrow at 10:00 AM**
2. Should schedule notification for **tomorrow at 8:00 AM** (or 10 AM if event is before 8 AM)
3. Wait for notification time
4. Should receive: "📅 Event Today"

**Expected Result**: Day-of-event notification received.

**Test Edge Cases**:
- [ ] Disable "Event Alerts" → Should NOT receive creation notification
- [ ] Create event in past → Should NOT schedule reminders
- [ ] Edit event date → Old notifications cancelled, new ones scheduled
- [ ] Delete event → All notifications cancelled

---

### 5. Test Notification Preferences

**Goal**: Verify settings toggle notifications on/off correctly.

**Steps**:
1. Go to Settings → Notifications
2. Toggle "Prayer Updates" OFF
3. Have someone pray for your request
4. Should NOT receive notification
5. Toggle back ON
6. Should receive notifications again

**Repeat for**:
- Devotional Reminders (should cancel scheduled notifications when disabled)
- Event Alerts

**Expected Result**: Preferences correctly enable/disable notifications.

---

### 6. Test Edge Function

**Goal**: Verify the Supabase Edge Function sends push notifications correctly.

**Manual Test**:
1. Get a push token from database:
   ```sql
   SELECT token FROM push_tokens WHERE user_id = 'your-user-id' LIMIT 1;
   ```

2. Test Edge Function directly:
   ```bash
   # Using Supabase CLI or API
   curl -X POST 'https://bmwyusrojmrlmintpjks.supabase.co/functions/v1/send-push-notification' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "user_id": "your-user-id",
       "title": "Test Notification",
       "body": "This is a test",
       "data": {"type": "test"}
     }'
   ```

3. Check device for notification

**Expected Result**: Notification received via Edge Function.

**Check Edge Function Logs**:
- Go to Supabase Dashboard → Edge Functions → `send-push-notification` → Logs
- Should see successful sends and any errors

---

## Debugging Tips

### Check Console Logs

Look for these log messages:
- ✅ `"Push token registered successfully"` - Token stored
- ✅ `"Notification received:"` - Notification received in foreground
- ❌ `"Error sending push notification:"` - Edge Function error
- ❌ `"Error registering for push notifications:"` - Token registration error

### Verify Database State

```sql
-- Check push tokens
SELECT * FROM push_tokens;

-- Check user preferences
SELECT user_id, prayer_notifications, devotional_reminders, event_alerts 
FROM user_preferences;

-- Check if devotional posted today
SELECT * FROM devotionals 
WHERE user_id = 'your-user-id' 
AND post_date = CURRENT_DATE;
```

### Check Scheduled Notifications

Add this temporary debug code to any screen:

```typescript
import * as Notifications from 'expo-notifications';

// In a useEffect or button handler
const checkScheduled = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('All scheduled notifications:', scheduled);
  scheduled.forEach(n => {
    console.log(`- ${n.identifier}: ${n.content.title} at ${n.trigger}`);
  });
};
```

### Common Issues

#### Issue: No push notifications received
**Solutions**:
1. Verify device is physical (not simulator)
2. Check notification permissions are granted
3. Verify push token exists in database
4. Check Edge Function logs for errors
5. Verify user preferences are enabled

#### Issue: Devotional reminder shows even when posted
**Note**: This is expected behavior - notification is scheduled in advance. The handler suppresses banner/sound, but notification may still appear in list.

#### Issue: Event notifications not scheduling
**Solutions**:
1. Check event date is in the future
2. Verify `scheduleEventNotifications` is called after event creation
3. Check console for errors

#### Issue: Push token not registering
**Solutions**:
1. Verify `projectId` in `app.json` matches EAS project
2. Check device is physical
3. Verify notification permissions granted
4. Check console for specific error messages

---

## Pre-Submission Checklist

Before submitting to TestFlight, verify:

- [ ] Push tokens register successfully on physical device
- [ ] Prayer notifications work between two different users
- [ ] Devotional reminders respect time preferences
- [ ] Devotional reminders suppress when user has posted
- [ ] Event creation sends push notifications to group members
- [ ] Event reminders schedule correctly (24h, 1h, day-of)
- [ ] Notification preferences toggle correctly
- [ ] Notification tap navigation works for all types
- [ ] Edge Function logs show successful sends
- [ ] No console errors related to notifications
- [ ] Tested with app in foreground, background, and closed
- [ ] Tested with notifications enabled/disabled in settings

---

## Quick Test Script

For rapid testing, create a test screen with buttons:

```typescript
// Add to a test/debug screen
const testNotifications = {
  // Test immediate local notification
  testLocal: async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test",
        sound: true,
      },
      trigger: null,
    });
  },
  
  // Test push notification
  testPush: async () => {
    const { session } = useAppStore.getState();
    if (session?.user?.id) {
      await sendPushNotification(
        session.user.id,
        "Test Push",
        "Testing push notifications",
        { type: "test" }
      );
    }
  },
  
  // Check scheduled notifications
  checkScheduled: async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled:', scheduled.length);
    return scheduled;
  },
};
```

---

## Testing with Multiple Devices

For best results, test with:
- **Device 1**: Account A (receives notifications)
- **Device 2**: Account B (triggers notifications)

This simulates real-world usage where different users interact.

---

## Next Steps After Testing

Once all tests pass:

1. **Build for TestFlight**:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to TestFlight**:
   ```bash
   eas submit --platform ios --latest
   ```

3. **Test with TestFlight build**:
   - Install via TestFlight
   - Repeat critical tests (prayer, event creation)
   - Verify push notifications work in production build

4. **Monitor Edge Function logs** in Supabase Dashboard during TestFlight testing

---

## Notes

- Local notifications work in simulators, but push notifications require physical devices
- Push notifications may take a few seconds to deliver
- Edge Function may have cold start delay (first call after inactivity)
- TestFlight builds have full push notification support
- Expo Go has limited push notification support - use development build for testing

