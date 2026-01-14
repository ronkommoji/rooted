# Rooted v2 - Comprehensive Audit & Recommendations

## Executive Summary

Rooted is a well-structured React Native/Expo app for Christian small groups. The codebase demonstrates good architectural decisions but has opportunities for improvement in onboarding UX, code optimization, and analytics implementation.

---

## Part 1: User Experience & Onboarding Analysis

### Current Onboarding Flow
```
Sign Up → Create/Join Group → Notification Permission → Main App
```

### Issues with Current Onboarding

1. **Missing Personal Context**: Users jump straight to group actions without establishing personal context
2. **No Value Preview**: Users don't see the app's value before committing to a group
3. **Abrupt Notification Ask**: Permission request happens before users understand why notifications matter
4. **No Profile Setup**: No first name collection beyond signup, no avatar setup
5. **No Preference Collection**: Missing opportunity to personalize experience

### Recommended Onboarding Flow (5 steps max)

```
1. Welcome/Value Props (swipeable cards)
2. Profile Setup (name already from signup, add optional avatar)
3. Create/Join Group (keep existing flow)
4. Personalization (devotional time preference, notification preview)
5. Enable Notifications (with context from step 4)
```

### Onboarding Questions to Consider Adding

**Essential (Non-overwhelming)**:
- "What time do you usually do your devotional?" - Sets default reminder time
- "Are you a group leader or member?" - Tailors onboarding messaging

**Optional (During first week via gentle prompts)**:
- Favorite Bible translation (if adding Bible features)
- Notification preferences refinement

### Onboarding Completion Optimization

**Skip/Later Options**:
- Avatar upload should be skippable
- Profile can be minimal (name from signup is sufficient)
- Notification permissions should have clear "Maybe Later" that doesn't make user feel guilty

**Progress Indicators**:
- Add step indicator (1/4, 2/4, etc.)
- Show what comes next to reduce anxiety

---

## Part 2: Product Perspective Improvements

### Feature Gaps

1. **No Offline Support**: App fails silently when offline
2. **No Deep Linking**: Can't share specific prayers/devotionals
3. **Limited Social Proof**: No indication of group activity/engagement
4. **Missing Gamification**: Streaks exist but aren't celebrated

### User Engagement Opportunities

1. **First-Time User Experience (FTUE)**
   - Empty states should guide users to take action
   - HomeScreen could have a "Getting Started" checklist
   - Consider a "7-day challenge" for new users

2. **Retention Features**
   - Weekly summary push notification ("Your group had 15 prayers this week!")
   - "Prayer answered" celebration moment
   - Streak celebration at milestones (7, 30, 100 days)

3. **Social Features**
   - Prayer "walls" could show who prayed (like Instagram story viewers)
   - Group activity feed on home screen
   - "@mention" support in devotional comments

### Navigation/UX Issues

1. **Settings Access**: Buried in tab navigation, should be more accessible
2. **No Search**: Can't search past prayers or devotionals
3. **Date Navigation**: Devotionals week picker could be more intuitive
4. **No Confirmation Feedback**: Actions like "Prayed" don't have haptic feedback

### Content Strategy

1. **Weekly Challenge**: Currently static 52 challenges - could be AI-generated or admin-customizable
2. **Prayer Categories**: No way to categorize/filter prayers (health, family, work, etc.)
3. **Devotional Templates**: Could offer guided reflection prompts

---

## Part 3: Engineering Improvements

### Architecture Issues

1. **Large Screen Components**: PrayerWallScreen.tsx (830 lines), EventsScreen.tsx (1292 lines) violate single responsibility
   - Extract modal components to separate files
   - Create custom hooks for data fetching logic

2. **Duplicate Modal Code**: Create/Edit modals share 80% of code
   - Solution: Create generic `FormModal` component with mode prop

3. **Inconsistent Error Handling**: Some screens use try/catch, others let errors bubble
   - Solution: Create `useAsyncAction` hook with standard error handling

### Performance Optimizations

1. **N+1 Queries in HomeScreen**
   ```typescript
   // Current: fetches RSVP count for each event separately
   eventsData.map(async (event) => {
     const { count } = await supabase...
   })

   // Better: Single query with aggregate
   // Or use database view/function
   ```

2. **Missing Memoization**
   - `renderPrayerCard` and `renderEventCard` recreated on every render
   - Should use `useCallback` for render functions
   - FlatList `keyExtractor` should be memoized

3. **Unnecessary Re-renders**
   - `useDevotionals` hook dependencies cause cascading re-renders
   - Consider splitting into smaller, focused hooks

4. **Image Optimization**
   - No image caching strategy for devotional images
   - No progressive loading/blur placeholder
   - Consider `expo-image` for better performance

### Code Quality Improvements

1. **Type Safety**
   ```typescript
   // Current: Many `any` casts
   (error as any).code

   // Better: Define error types
   interface RateLimitError extends Error {
     code: 'RATE_LIMIT_EXCEEDED';
     retryAfter: number;
   }
   ```

2. **Constants Extraction**
   ```typescript
   // Current: Magic numbers scattered throughout
   const maxLoadingTimeout = 30000;

   // Better: Centralized config
   // src/config/constants.ts
   export const TIMEOUTS = {
     AUTH_INIT: 30000,
     API_REQUEST: 15000,
     DEBOUNCE: 300,
   };
   ```

3. **Custom Hooks for Business Logic**
   ```typescript
   // Create: src/hooks/usePrayers.ts
   // Create: src/hooks/useEvents.ts
   // Move business logic out of screens
   ```

### State Management Improvements

1. **Zustand Store Cleanup**
   - `useAppStore` is becoming a kitchen sink
   - Consider splitting: `useAuthStore`, `useGroupStore`, `usePreferencesStore`

2. **Missing Loading States**
   - No global loading state for initial app load
   - Individual screens manage their own loading inconsistently

3. **Cache Invalidation**
   - No cache invalidation strategy
   - Data fetched multiple times unnecessarily

### Security Considerations

1. **Rate Limiter Storage**
   - Currently uses AsyncStorage which can be cleared by user
   - Consider server-side rate limiting for critical operations

2. **Input Validation**
   - Group names, prayer content not sanitized
   - Consider XSS prevention for any web view scenarios

---

## Part 4: Analytics Implementation

### Recommended Analytics Events

#### Onboarding Funnel
```typescript
// Track each step to identify drop-off
analytics.track('onboarding_started');
analytics.track('onboarding_step_completed', { step: 'choice' });
analytics.track('onboarding_step_completed', { step: 'create_group' });
analytics.track('onboarding_step_completed', { step: 'join_group' });
analytics.track('onboarding_step_completed', { step: 'notifications' });
analytics.track('onboarding_completed', {
  duration_seconds: number,
  joined_existing_group: boolean,
  notifications_enabled: boolean
});
analytics.track('onboarding_abandoned', { step: string, reason?: string });
```

#### Core Feature Engagement
```typescript
// Devotionals
analytics.track('devotional_uploaded', {
  streak_count: number,
  day_of_week: string,
  time_of_day: string,
  image_size_kb: number
});
analytics.track('devotional_viewed', { author_is_self: boolean });
analytics.track('devotional_liked');
analytics.track('devotional_deleted');

// Prayers
analytics.track('prayer_created', { has_content: boolean });
analytics.track('prayer_prayed', { is_own_prayer: boolean });
analytics.track('prayer_marked_answered', { days_since_created: number });

// Events
analytics.track('event_created');
analytics.track('event_rsvp', { status: 'yes' | 'no' });
analytics.track('event_viewed');
```

#### Retention Metrics
```typescript
analytics.track('app_opened', {
  days_since_last_open: number,
  session_count: number
});
analytics.track('daily_active');
analytics.track('weekly_active');
analytics.track('feature_used', { feature: string });
```

### Implementation Approach

**Option 1: Expo Analytics (Simplest)**
```typescript
// Install: npx expo install expo-analytics
import * as Analytics from 'expo-analytics';

// Create: src/lib/analytics.ts
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    // Development logging
    if (__DEV__) {
      console.log('[Analytics]', event, properties);
      return;
    }

    // Production tracking
    Analytics.logEvent(event, properties);
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    Analytics.setUserId(userId);
    if (traits) Analytics.setUserProperties(traits);
  },

  screen: (name: string) => {
    Analytics.logScreenView(name);
  }
};
```

**Option 2: PostHog (Recommended for Growth)**
- Open source, privacy-focused
- Feature flags built-in
- Session replay for debugging

```typescript
// Install: npm install posthog-react-native
import PostHog from 'posthog-react-native';

// Initialize in App.tsx
const posthog = new PostHog('YOUR_API_KEY', {
  host: 'https://app.posthog.com'
});

export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    posthog.capture(event, properties);
  },
  identify: (userId: string, traits?: Record<string, any>) => {
    posthog.identify(userId, traits);
  }
};
```

**Option 3: Supabase-Native (Zero New Dependencies)**
```sql
-- Create analytics table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
```

```typescript
// src/lib/analytics.ts
import { supabase } from './supabase';

export const analytics = {
  track: async (event: string, properties?: Record<string, any>) => {
    const { session } = useAppStore.getState();

    // Fire and forget - don't await to avoid blocking UI
    supabase.from('analytics_events').insert({
      user_id: session?.user?.id,
      event_name: event,
      properties
    }).then(({ error }) => {
      if (error) console.error('Analytics error:', error);
    });
  }
};
```

### Dashboard Requirements

Track these key metrics:
1. **Onboarding Completion Rate**: % of signups that complete onboarding
2. **D1/D7/D30 Retention**: % of users returning after 1/7/30 days
3. **Feature Adoption**: % of users who use each feature
4. **Devotional Streak Distribution**: Histogram of streak lengths
5. **Prayer Engagement**: Average prayers per user per week
6. **Group Health**: Average posts per group per week

---

## Part 5: Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Add analytics foundation (Option 3 - Supabase native)
- [ ] Track onboarding completion
- [ ] Track core feature usage
- [ ] Add haptic feedback to interactions
- [ ] Fix N+1 query in HomeScreen

### Phase 2: Onboarding Improvements (2-3 weeks)
- [ ] Add onboarding progress indicator
- [ ] Collect devotional time preference during onboarding
- [ ] Improve notification permission screen with value preview
- [ ] Add "Getting Started" checklist for new users

### Phase 3: Code Quality (2-3 weeks)
- [ ] Extract modal components from large screens
- [ ] Create `usePrayers` and `useEvents` hooks
- [ ] Add proper TypeScript types for errors
- [ ] Implement proper error boundary

### Phase 4: Performance (2 weeks)
- [ ] Add image caching with expo-image
- [ ] Implement proper memoization
- [ ] Add offline support with optimistic updates
- [ ] Optimize Supabase queries

### Phase 5: Engagement Features (3-4 weeks)
- [ ] Add streak milestone celebrations
- [ ] Implement weekly summary notifications
- [ ] Add prayer categories/filtering
- [ ] Create group activity feed

---

## Appendix: File-by-File Issues

| File | Lines | Issues |
|------|-------|--------|
| `PrayerWallScreen.tsx` | 830 | Too large, mixed concerns, duplicate modal code |
| `EventsScreen.tsx` | 1292 | Way too large, needs splitting into 4-5 files |
| `useDevotionals.ts` | 476 | Good hook pattern but could split image upload |
| `AuthContext.tsx` | 334 | Complex but necessary; consider extracting rate limit logic |
| `useAppStore.ts` | 392 | Growing too large, split into domain stores |
| `OnboardingScreen.tsx` | 426 | Missing progress indicator, no value props |

---

*Last updated: January 2024*
*Author: Claude Code Audit*
