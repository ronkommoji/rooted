# 📱 Notification Implementation Analysis Report
## Rooted App - iOS Engineer Review

**Date:** January 2025  
**Expo SDK Version:** 54.0.31  
**expo-notifications Version:** 0.32.16  
**Reviewer:** iOS Notification Division

---

## Executive Summary

The current notification implementation has **several critical issues** that prevent it from functioning properly in production. The code uses **deprecated APIs**, has **missing iOS permission handling**, **duplicate listeners**, and **no push notification infrastructure**. This report identifies all issues and provides actionable recommendations.

---

## 🔴 Critical Issues

### 1. **Deprecated Notification Handler Properties**
**Severity:** HIGH  
**Location:** `src/lib/notifications.ts:6-12`

**Current Code:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // ❌ DEPRECATED
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Issue:** The property `shouldShowAlert` is deprecated. According to Expo SDK 54 documentation, it should be `shouldShowBanner` and `shouldShowList`.

**Correct Implementation:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,    // ✅ Correct
    shouldShowList: true,      // ✅ Correct
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Impact:** Notifications may not display properly on iOS devices.

---

### 2. **Missing iOS Permission Options**
**Severity:** HIGH  
**Location:** `src/lib/notifications.ts:24-54`

**Current Code:**
```typescript
const { status } = await Notifications.requestPermissionsAsync();
```

**Issue:** No iOS-specific permission options are specified. iOS requires explicit permission requests for alerts, badges, and sounds.

**Correct Implementation:**
```typescript
const { status } = await Notifications.requestPermissionsAsync({
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
    allowAnnouncements: false, // Optional: for spoken notifications
  },
});
```

**Impact:** iOS may not grant all necessary permissions, limiting notification functionality.

---

### 3. **Incorrect iOS Permission Status Checking**
**Severity:** HIGH  
**Location:** `src/lib/notifications.ts:34`

**Current Code:**
```typescript
if (finalStatus !== 'granted') {
  console.warn('Notification permissions not granted');
  return false;
}
```

**Issue:** On iOS, you must check `ios.status` field, not the root `status` field. iOS has multiple authorization states (PROVISIONAL, EPHEMERAL, etc.) that should be handled.

**Correct Implementation:**
```typescript
const permissions = await Notifications.getPermissionsAsync();
const isGranted = 
  permissions.granted || 
  permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

if (!isGranted) {
  // Handle denied permissions
  return false;
}
```

**Impact:** App may incorrectly report permission status on iOS, leading to broken functionality.

---

### 4. **No Device Check Before Push Token Registration**
**Severity:** MEDIUM  
**Location:** `src/lib/notifications.ts:252-262`

**Current Code:**
```typescript
export async function getNotificationToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'a89bfa54-b55b-4597-b84a-45e0123cd4ef',
    });
    return token.data;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
}
```

**Issue:** No check for physical device. Push tokens only work on physical devices, not simulators. Also hardcoded projectId instead of using Constants.

**Correct Implementation:**
```typescript
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function getNotificationToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId;
    
    if (!projectId) {
      throw new Error('Project ID not found');
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
}
```

**Impact:** Function will fail silently on simulators and may use incorrect projectId.

---

### 5. **Duplicate Notification Listeners**
**Severity:** MEDIUM  
**Location:** `src/hooks/useNotifications.ts:27-35` and `src/context/NotificationContext.tsx:21-24`

**Issue:** Both `useNotifications` hook and `NotificationContext` set up `addNotificationResponseReceivedListener`. This creates duplicate handlers that may cause:
- Multiple navigation attempts
- Memory leaks
- Unpredictable behavior

**Recommendation:** Remove listener from `useNotifications` hook since `NotificationContext` already handles navigation.

---

### 6. **Missing Push Notification Infrastructure**
**Severity:** CRITICAL  
**Location:** Entire codebase

**Issue:** The app only implements **local notifications**. There's no:
- Push token registration on app startup
- Push token storage in database
- Backend service to send push notifications
- Handling of remote push notifications

**Current State:** All notifications are local-only (scheduled on device). This means:
- ❌ Users can't receive notifications when app is closed
- ❌ No cross-device notifications
- ❌ No server-initiated notifications (e.g., "Someone prayed for your request")

**Impact:** The prayer notification feature you removed earlier was correct in concept but wrong in implementation - you need **push notifications**, not local notifications.

---

## ⚠️ Medium Priority Issues

### 7. **Notification Handler Timing**
**Location:** `src/lib/notifications.ts:6`

**Issue:** `setNotificationHandler` is called at module load time, which is good, but it should be called **before** any other notification operations. Currently it's fine, but worth documenting.

---

### 8. **Missing Error Handling in Event Scheduling**
**Location:** `src/lib/notifications.ts:142-216`

**Issue:** The `scheduleEventNotifications` function doesn't handle edge cases:
- What if event is in the past?
- What if event is less than 1 hour away?
- No validation of event date

**Recommendation:** Add validation before scheduling.

---

### 9. **Notification Channel Not Created Before Permission Request**
**Location:** `src/lib/notifications.ts:39-47`

**Issue:** On Android, notification channel should be created **before** requesting permissions. Current order is correct, but the channel name "Default" is generic.

**Recommendation:** Use more descriptive channel names like "Prayer Updates", "Devotional Reminders", etc.

---

### 10. **No Notification Badge Management**
**Location:** Entire codebase

**Issue:** While `shouldSetBadge: true` is set, there's no code to:
- Clear badge when app opens
- Set badge count based on unread items
- Reset badge when user views notifications

**Recommendation:** Add badge management in App.tsx or notification handlers.

---

## 📋 Code Quality Issues

### 11. **Missing Type Safety**
**Location:** `src/lib/notifications.ts:254`

**Issue:** Hardcoded projectId string instead of using type-safe Constants.

### 12. **Inconsistent Error Handling**
**Location:** Multiple files

**Issue:** Some functions return `null` on error, others return `false`, others throw. Should be consistent.

### 13. **No Notification Categories (iOS)**
**Location:** Entire codebase

**Issue:** iOS supports notification categories for action buttons. Not implemented but could enhance UX.

---

## ✅ What's Working Well

1. ✅ **Notification Handler Setup** - Correctly placed at module level
2. ✅ **Android Channel Configuration** - Properly configured with importance and vibration
3. ✅ **Preference-Based Notifications** - Good integration with user preferences
4. ✅ **Navigation Integration** - NotificationContext properly handles deep linking
5. ✅ **Scheduled Notifications** - Devotional reminders are properly scheduled
6. ✅ **Notification Data Structure** - Good use of typed NotificationData interface

---

## 🚀 Recommendations

### Immediate Actions (Before Production)

1. **Fix Deprecated APIs**
   - Replace `shouldShowAlert` with `shouldShowBanner` and `shouldShowList`
   - Update iOS permission request to include explicit options

2. **Fix iOS Permission Checking**
   - Use `ios.status` field for iOS permission checks
   - Handle PROVISIONAL and EPHEMERAL states

3. **Remove Duplicate Listeners**
   - Remove `addNotificationResponseReceivedListener` from `useNotifications` hook
   - Keep only in `NotificationContext`

4. **Add Device Check**
   - Import `expo-device` and `expo-constants`
   - Add device check before push token registration
   - Use Constants for projectId

### Short-Term (Next Sprint)

5. **Implement Push Notification Infrastructure**
   - Register push tokens on app startup
   - Store tokens in Supabase database
   - Create backend function to send push notifications
   - Update prayer notification to use push instead of local

6. **Add Badge Management**
   - Clear badge on app open
   - Set badge count for unread prayers/devotionals

7. **Improve Error Handling**
   - Consistent error handling pattern
   - User-friendly error messages
   - Retry logic for failed operations

### Long-Term (Future Enhancements)

8. **Notification Categories (iOS)**
   - Add action buttons to notifications
   - Quick actions (e.g., "Mark as Read", "Reply")

9. **Rich Notifications**
   - Add images to notifications
   - Custom notification sounds
   - Notification grouping

10. **Analytics**
    - Track notification delivery rates
    - Monitor permission grant rates
    - A/B test notification content

---

## 📝 Code Examples

### Fixed Notification Handler
```typescript
// src/lib/notifications.ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,    // ✅ Fixed
    shouldShowList: true,      // ✅ Fixed
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Fixed Permission Request
```typescript
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
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

    // ✅ Proper iOS status checking
    const permissions = await Notifications.getPermissionsAsync();
    const isGranted = 
      permissions.granted || 
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!isGranted) {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Android channel setup
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
```

### Push Token Registration (New)
```typescript
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId;
    
    if (!projectId) {
      throw new Error('Project ID not found');
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    
    // TODO: Store token in Supabase database
    // await supabase.from('user_push_tokens').upsert({
    //   user_id: session.user.id,
    //   token: token.data,
    //   platform: Platform.OS,
    // });
    
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}
```

---

## 🔍 Testing Checklist

- [ ] Test notification handler with deprecated properties removed
- [ ] Test iOS permission request with explicit options
- [ ] Test iOS permission status checking (PROVISIONAL, AUTHORIZED, DENIED)
- [ ] Test on physical iOS device (simulator doesn't support push)
- [ ] Test notification navigation on tap
- [ ] Test scheduled notifications (devotional reminders)
- [ ] Test notification cancellation
- [ ] Test with permissions denied
- [ ] Test with permissions granted
- [ ] Test badge clearing on app open
- [ ] Test duplicate listener removal
- [ ] Test error handling paths

---

## 📚 References

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [iOS Notification Best Practices](https://developer.apple.com/notifications/)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)

---

## Conclusion

The notification implementation has **4 critical issues** that must be fixed before production, and **6 medium-priority issues** that should be addressed soon. The most critical gap is the **lack of push notification infrastructure**, which prevents cross-device notifications and server-initiated notifications.

**Estimated Fix Time:** 2-3 days for critical issues, 1 week for full push notification implementation.

**Priority Order:**
1. Fix deprecated APIs (30 min)
2. Fix iOS permissions (1 hour)
3. Remove duplicate listeners (15 min)
4. Add device check (30 min)
5. Implement push notifications (2-3 days)

---

**Report Generated:** January 2025  
**Next Review:** After critical fixes implemented

