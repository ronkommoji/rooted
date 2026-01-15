# Fireworks Celebration Feature Implementation

## Overview
This document describes the implementation of the fireworks celebration feature using `react-native-fiesta`. Fireworks animations are triggered in two scenarios:
1. When a prayer is marked as answered
2. When all group members have uploaded their devotionals for a given date

## Architecture

### Components

1. **Database Table: `celebrations`**
   - Tracks pending celebrations for each user
   - Stores celebration type (`prayer_answered` or `all_devotionals_complete`)
   - Marks celebrations as shown when user views them
   - Located in: `supabase/migrations/create_celebrations_table.sql`

2. **Celebration Service** (`src/services/celebrationService.ts`)
   - `checkAllDevotionalsComplete()`: Checks if all group members have uploaded devotionals
   - `createDevotionalCelebration()`: Creates celebration records for all members when devotionals are complete
   - `createPrayerAnsweredCelebration()`: Creates celebration records when a prayer is answered
   - `getPendingCelebrations()`: Retrieves unshown celebrations for a user
   - `markCelebrationAsShown()`: Marks a celebration as viewed

3. **Fireworks Component** (`src/components/Fireworks.tsx`)
   - Wrapper component that triggers the react-native-fiesta fireworks animation
   - Uses the `useFiesta` hook to run animations
   - Handles animation lifecycle

4. **Celebration Context** (`src/context/CelebrationContext.tsx`)
   - Manages celebration state and fireworks display
   - Automatically checks for pending celebrations on app open
   - Queues multiple celebrations to show sequentially
   - Wraps app with `FiestaProvider` for animation support

## Flow

### Prayer Answered Flow
1. User marks a prayer as answered in `PrayerWallScreen`
2. `createPrayerAnsweredCelebration()` creates celebration records for all group members
3. Current user sees fireworks immediately via `showFireworks()`
4. Other members see fireworks when they next open the app

### All Devotionals Complete Flow
1. User uploads a devotional via `useDevotionals` hook
2. After upload, `checkAllDevotionalsComplete()` verifies if all members have posted
3. If complete, `createDevotionalCelebration()` creates celebration records for all members
4. Current user's celebration is checked and shown
5. Other members see fireworks when they next open the app

### App Open Flow
1. When user logs in or app opens, `CelebrationContext` checks for pending celebrations
2. If found, fireworks are shown sequentially (one after another)
3. Each celebration is marked as shown after being displayed

## Database Schema

```sql
CREATE TABLE celebrations (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES profiles(id),
  celebration_type TEXT CHECK (celebration_type IN ('prayer_answered', 'all_devotionals_complete')),
  related_id UUID, -- prayer_id or post_date
  post_date DATE, -- For devotional completions
  created_at TIMESTAMP,
  shown_at TIMESTAMP -- When user viewed the animation
);
```

## Setup Instructions

1. **Run Database Migration**
   ```sql
   -- Execute the SQL in supabase/migrations/create_celebrations_table.sql
   -- via Supabase Dashboard SQL Editor or CLI
   ```

2. **Dependencies** (already installed)
   - `react-native-fiesta`
   - `@shopify/react-native-skia`
   - `react-native-reanimated`

3. **Integration Points**
   - `App.tsx`: Wraps app with `CelebrationProvider`
   - `PrayerWallScreen.tsx`: Triggers celebrations on prayer answered
   - `useDevotionals.ts`: Checks and creates celebrations on devotional upload

## Testing

1. **Test Prayer Answered**:
   - Mark a prayer as answered
   - Verify fireworks appear immediately
   - Check that celebration record is created in database

2. **Test All Devotionals Complete**:
   - Have all group members upload devotionals for the same date
   - Verify fireworks appear for the last member who uploads
   - Check that celebration records are created for all members
   - Verify other members see fireworks on next app open

3. **Test Offline Users**:
   - Have a user be offline when celebration is created
   - When they come online and open app, verify they see the fireworks

## Notes

- Celebrations are queued and shown sequentially if multiple exist
- Each celebration is automatically marked as shown after display
- The system prevents duplicate celebrations for the same event
- Fireworks use the app's color scheme (Deep Sage, Golden Wheat, etc.)
