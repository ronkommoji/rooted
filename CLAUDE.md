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

---

## Code Quality & Audit Status

**Last Audit:** January 2026
**Overall Score:** 6.5/10 (C+)
**Status:** Production-ready with improvements needed

### Scores by Category
- Architecture & Structure: 8/10
- Code Quality: 7/10
- Security: 7/10
- Performance: 6/10
- Testing: 4/10
- Best Practices: 7/10
- Documentation: 6/10
- Maintainability: 7/10

---

## Known Issues & Technical Debt

### 🔴 CRITICAL (Fix Before Production Scale)

1. **N+1 Query Problem** - `src/hooks/queries/useDevotionalsQuery.ts:177-189`
   - Loop fetches comments individually instead of batch query
   - For 50 users, makes 50+ database queries instead of 1
   - **Fix:** Batch fetch all comments with `.in()` query, group in memory
   - **Impact:** High - Major performance bottleneck

2. **Weak Password Validation** - `src/screens/auth/SignUpScreen.tsx:45`
   - Only validates length (6+ chars)
   - No complexity requirements (uppercase, numbers, special chars)
   - **Fix:** Implement password strength validator
   - **Impact:** High - Security vulnerability

3. **Memory Leak in Global Cache** - `src/lib/devotionalApi.ts:32-34`
   - Module-level variables never cleared on app backgrounding
   - Causes stale devotional data
   - **Fix:** Add AppState listener to clear cache
   - **Impact:** Medium - Data freshness issue

4. **Missing Input Sanitization** - Auth screens
   - Email/name fields not trimmed before submission
   - Allows leading/trailing whitespace bugs
   - **Fix:** Add `.trim()` before all auth inputs
   - **Impact:** Medium - Data quality issue

### 🟡 HIGH PRIORITY (Next Sprint)

5. **Insufficient Test Coverage**
   - Only 3 test files exist
   - Coverage threshold at 50% (should be 70%+)
   - No integration or e2e tests
   - **Fix:** Add comprehensive unit tests for hooks, integration tests for Supabase
   - **Impact:** High - Hard to maintain and refactor safely

6. **No Realtime Subscriptions**
   - Using Supabase but missing realtime features
   - Users must manually refresh for new data
   - **Fix:** Add Supabase channel subscriptions for devotionals, prayers, events
   - **Impact:** Medium - UX degradation

7. **Excessive `any` Types**
   - 140+ instances of `any` type usage
   - Examples: `useDevotionalsQuery.ts:94,96`, navigation types
   - **Fix:** Replace with proper TypeScript types
   - **Impact:** Medium - Type safety compromised

8. **No Accessibility Labels**
   - Missing `accessibilityLabel` and `accessibilityRole` throughout
   - Screen readers won't work properly
   - **Fix:** Add accessibility props to all interactive components
   - **Impact:** High - Excludes users with disabilities

### 🟢 MEDIUM PRIORITY (Future)

9. **No Pagination**
   - All queries load full datasets
   - Could cause issues with 1000+ records
   - **Fix:** Implement cursor-based pagination

10. **Client-Side Rate Limiting Only**
    - Rate limiter in AsyncStorage (easily bypassed)
    - **Fix:** Add server-side validation with Supabase Edge Functions

11. **No Error Boundary Component**
    - App could crash without fallback UI
    - **Fix:** Add error boundary with retry mechanism

12. **Generic Loading States**
    - Only shows spinners, no skeleton screens
    - **Fix:** Add skeleton loading components

13. **No Remote Logging/Analytics**
    - Logger prepared but not configured for production
    - **Fix:** Integrate Sentry or LogRocket

---

## Development Best Practices

### When Adding Features

1. **Always use TypeScript** - No `any` types unless absolutely necessary
2. **Write tests first** - Especially for data mutations and auth flows
3. **Consider realtime** - Can users benefit from live updates?
4. **Think accessibility** - Add labels to all interactive elements
5. **Validate inputs** - Trim, sanitize, and validate all user inputs
6. **Optimize queries** - Batch queries when possible, avoid N+1 patterns
7. **Handle errors gracefully** - Don't let users see raw error messages
8. **Add loading states** - Use skeletons instead of just spinners
9. **Test offline behavior** - What happens without internet?
10. **Document complex logic** - Add comments for non-obvious code

### Query Optimization Patterns

**❌ Bad: N+1 Query**
```typescript
for (const userId of userIds) {
  const { data } = await supabase
    .from('prayers')
    .select('*')
    .eq('user_id', userId);
}
```

**✅ Good: Batch Query**
```typescript
const { data } = await supabase
  .from('prayers')
  .select('*')
  .in('user_id', userIds);
```

### Password Validation Pattern

```typescript
const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) return { valid: false, error: 'Minimum 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Needs uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Needs lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Needs number' };
  return { valid: true };
};
```

### Realtime Subscription Pattern

```typescript
useEffect(() => {
  const channel = supabase
    .channel('devotionals-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'devotionals', filter: `group_id=eq.${groupId}` },
      (payload) => {
        queryClient.invalidateQueries(queryKeys.devotionals.all());
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [groupId]);
```

### Input Sanitization Pattern

```typescript
const handleSignUp = async () => {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  const trimmedPassword = password.trim();

  // Validation here
  await signUp(trimmedEmail, trimmedPassword, trimmedName);
};
```

---

## Testing Guidelines

### Required Test Coverage
- **Unit tests**: All custom hooks, utilities, business logic (70%+ coverage)
- **Integration tests**: Supabase queries, auth flows, mutations
- **Component tests**: Critical UI components (Input, Button, screens)
- **E2E tests** (future): Complete user journeys (sign up → join group → post devotional)

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
npm run test:ci          # CI mode (used in GitHub Actions)
```

### Test File Structure
```
src/
  hooks/
    queries/
      useDevotionalsQuery.ts
      __tests__/
        useDevotionalsQuery.test.ts
  lib/
    asyncUtils.ts
    __tests__/
      asyncUtils.test.ts
```

---

## Performance Optimization Checklist

Before shipping a feature, verify:
- [ ] No N+1 query patterns
- [ ] Queries use proper indexes (check Supabase dashboard)
- [ ] Large lists use pagination or virtual scrolling
- [ ] Images are compressed and cached
- [ ] Heavy computations are memoized with `useMemo`
- [ ] Callbacks are memoized with `useCallback`
- [ ] React Query staleTime is appropriate (2-5 min for most data)
- [ ] No unnecessary re-renders (use React DevTools Profiler)
- [ ] Async operations have timeout protection
- [ ] Realtime subscriptions are properly cleaned up

---

## Security Checklist

Before shipping a feature, verify:
- [ ] All user inputs are validated and sanitized
- [ ] Passwords meet complexity requirements
- [ ] No API keys or secrets in code (use env variables)
- [ ] File uploads validate MIME type and size
- [ ] Authentication tokens are stored in SecureStore (not AsyncStorage)
- [ ] Row Level Security (RLS) policies are enabled in Supabase
- [ ] Rate limiting is in place for sensitive operations
- [ ] Error messages don't expose sensitive information
- [ ] SQL injection is prevented (use parameterized queries)
- [ ] XSS is prevented (no dangerouslySetInnerHTML or eval)

---

## Accessibility Checklist

Before shipping a feature, verify:
- [ ] All interactive elements have `accessibilityLabel`
- [ ] All interactive elements have `accessibilityRole`
- [ ] Forms have proper `accessibilityHint` for complex interactions
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)
- [ ] UI is navigable with screen reader (VoiceOver/TalkBack)
- [ ] Touch targets are at least 44x44 points
- [ ] Focus indicators are visible
- [ ] Error messages are announced to screen readers
- [ ] Loading states are announced
- [ ] Success confirmations are announced

---

## Recommended Future Features

### High Impact
1. **Bible Study Plans** - Guided reading plans with progress tracking
2. **Voice Prayer Requests** - Record audio prayers for deeper connection
3. **Prayer Journals** - Personal journaling with answered prayer tracking
4. **Group Challenges** - Gamification for spiritual growth (weekly challenges, badges)
5. **Worship Music Integration** - Spotify/Apple Music for devotional time

### Community Enhancement
6. **Small Group Video Calls** - Built-in video conferencing
7. **Discussion Forums** - Threaded discussions on Bible passages
8. **Mentorship Matching** - Connect experienced believers with new Christians
9. **Service Project Coordination** - Organize community service
10. **Sermon Notes & Sharing** - Take notes during sermons, share with group

### Personalization
11. **AI Prayer Suggestions** - GPT-4 powered prayer prompts
12. **Custom Devotional Themes** - Personalized color schemes and fonts
13. **Multi-Group Support** - Allow users in multiple small groups
14. **Offline Mode** - Full functionality without internet
15. **Notification Customization** - Granular control over notifications

### Analytics & Insights
16. **Spiritual Growth Dashboard** - Visualize personal spiritual metrics
17. **Group Health Metrics** - Admin dashboard for engagement
18. **Prayer Request Analytics** - Track answered prayer rates

---

## Maintenance Notes

### Dependency Updates
- All dependencies are current as of January 2026
- React 19.1.0, Expo 54, React Query v5, Zustand v5
- Run `npm outdated` monthly to check for updates
- Test thoroughly after major version updates

### Database Migrations
- Use Supabase CLI for schema changes: `supabase db push`
- Always update `src/types/database.ts` after schema changes
- Test migrations in development before production
- Keep migration scripts in version control

### Common Gotchas
- **Expo updates (EAS)**: Only work for JS changes, not native code changes
- **Supabase RLS**: Always test RLS policies before deploying
- **Push notifications**: Test on physical devices, not simulators
- **Image uploads**: Supabase storage has 50MB file limit
- **AsyncStorage**: Has 6MB limit on iOS, use SecureStore for sensitive data
