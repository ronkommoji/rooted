# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rooted is a React Native/Expo mobile app for Christian small groups. It provides devotional sharing, prayer walls, event planning, and group management features.

## Development Commands

```bash
npm start           # Start Expo dev server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm run web         # Run in web browser
```

## Build & Deployment

```bash
eas build --platform ios --profile production    # iOS production build
eas build --platform ios --profile preview       # iOS preview (direct install)
eas submit --platform ios --latest               # Submit to TestFlight
eas update --branch production --message "msg"   # OTA update (JS changes only)
```

## Architecture

### Provider Hierarchy (App.tsx)
```
SafeAreaProvider
  └─ AuthProvider (auth state, sign in/out)
      └─ ThemeProvider (light/dark mode)
          └─ NotificationProvider (push notifications)
              └─ RootNavigator
```

### Navigation Flow (src/navigation/RootNavigator.tsx)
- No session → `AuthNavigator` (sign in/sign up)
- Session but no group → `OnboardingScreen` (create/join group)
- Session + group → `MainNavigator` (main app tabs)

### State Management
- **Zustand store** (`src/store/useAppStore.ts`): Global state for session, profile, current group, group members, preferences
- **React Context**: Auth operations (AuthContext), theme (ThemeContext), notifications (NotificationContext)

### Backend
- **Supabase**: PostgreSQL database, authentication, realtime subscriptions
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Key Database Tables
- `profiles`: User profiles
- `groups`: Small groups with invite codes
- `group_members`: Group membership with roles (admin/member)
- `prayers`: Prayer requests with answered status
- `devotionals`: Daily devotional posts with likes/comments
- `events`: Group events with RSVP tracking
- `user_streaks`: Devotional posting streaks

### Type System
- Database types in `src/types/database.ts` - auto-generated from Supabase schema
- Use `Tables<'tablename'>` for row types
- Extended types like `DevotionalWithAuthor`, `PrayerWithAuthor` include relations

## Code Patterns

### Supabase Queries with Timeout
The app uses `withTimeout` and `allSettledWithTimeout` from `src/lib/asyncUtils.ts` to prevent hanging on slow network:
```typescript
const { data, error } = await withTimeout(
  supabase.from('profiles').select('*').single(),
  15000,
  'Failed to fetch: timeout'
);
```

### Rate Limiting
Auth operations use `src/lib/rateLimiter.ts` to prevent brute force attacks on sign in/sign up.

### Screen Organization
Feature screens are in `src/screens/{feature}/` with components in a `components/` subfolder and hooks in `hooks/`.
