# Future Codebase Improvements

This document tracks recommended improvements for the Rooted codebase based on the January 2026 audit.

**Status**: These are improvements to be implemented after the critical fixes have been deployed.

---

## 🟡 HIGH PRIORITY

### 7. Excessive `any` Types (TypeScript Type Safety)
**Status**: Not started
**Impact**: Medium - Type safety compromised
**Effort**: Medium

**Problem**: 140+ instances of `any` type usage throughout the codebase, particularly in query hooks and navigation types.

**Examples**:
- `src/hooks/queries/useDevotionalsQuery.ts:94,96` - `let likesData: any[]`
- `src/screens/auth/SignInScreen.tsx:20` - `navigation: NativeStackNavigationProp<any>`
- Multiple query hooks have weakly typed parameters

**Solution**:
1. Create proper TypeScript types for all navigation stacks
2. Replace `any[]` with properly typed arrays using database types
3. Add strict typing to React Query hooks
4. Enable stricter TypeScript compiler options

**Files to Update**:
- All query hooks in `src/hooks/queries/`
- Navigation type definitions
- Component props with `any` types

---

### 8. No Accessibility Labels
**Status**: Not started
**Impact**: High - Excludes users with disabilities
**Effort**: High

**Problem**: Missing `accessibilityLabel` and `accessibilityRole` throughout the app. Screen readers won't work properly.

**Solution**:
1. Add accessibility props to all interactive components
2. Test with VoiceOver (iOS) and TalkBack (Android)
3. Follow WCAG AA standards for color contrast
4. Ensure touch targets are at least 44x44 points

**Components to Update**:
- All Button components
- All TouchableOpacity/Pressable elements
- Input fields
- Cards and interactive elements
- Modal dialogs

**Example Implementation**:
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Create new prayer request"
  accessibilityHint="Opens a form to submit a prayer request to your group"
  onPress={handleCreatePrayer}
>
  <Text>New Prayer</Text>
</TouchableOpacity>
```

---

## 🟢 MEDIUM PRIORITY

### 9. No Pagination
**Status**: Not started
**Impact**: Medium - Could cause performance issues with large datasets
**Effort**: Medium

**Problem**: All queries load full datasets without pagination. This works fine with <100 records but could cause issues with 1000+ prayers, devotionals, or events.

**Solution**:
1. Implement cursor-based pagination for all list queries
2. Add infinite scroll to FlashList components
3. Use React Query's infinite query hooks
4. Set reasonable page sizes (20-50 items)

**Queries to Update**:
- `usePrayersQuery` - Can grow to thousands of requests
- `useDevotionalsQuery` - Historical devotionals accumulate
- `useEventsQuery` - Past events list grows indefinitely

**Example Implementation**:
```typescript
export const usePrayersInfiniteQuery = (filter: boolean | 'all' = 'all') => {
  return useInfiniteQuery({
    queryKey: queryKeys.prayers.filtered(groupId || '', filter),
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('prayers')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 19); // 20 items per page

      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 20 ? pages.length * 20 : undefined;
    },
    enabled: !!groupId,
  });
};
```

---

### 10. Client-Side Rate Limiting Only
**Status**: Not started
**Impact**: Medium - Security vulnerability
**Effort**: High

**Problem**: Rate limiter in `src/lib/rateLimiter.ts` stores data in AsyncStorage (unencrypted, client-side). This can be easily bypassed by attackers.

**Solution**:
1. Implement server-side rate limiting using Supabase Edge Functions
2. Keep client-side rate limiting for UX feedback
3. Add IP-based rate limiting for auth endpoints
4. Track failed login attempts in database

**Implementation Steps**:
1. Create Supabase Edge Function for auth rate limiting
2. Use Upstash Redis or Supabase for server-side tracking
3. Return proper HTTP 429 (Too Many Requests) responses
4. Add exponential backoff for repeated failures

**Supabase Edge Function Example**:
```typescript
// supabase/functions/auth-rate-limit/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email } = await req.json()

  // Check rate limit in Redis/Supabase
  const attempts = await checkAttempts(email)

  if (attempts > 5) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts' }),
      { status: 429 }
    )
  }

  // Increment attempt counter
  await incrementAttempts(email)

  return new Response(JSON.stringify({ allowed: true }))
})
```

---

### 11. No Error Boundary Component
**Status**: Not started
**Impact**: Medium - Poor error handling UX
**Effort**: Low

**Problem**: App could crash without fallback UI if a component throws an error.

**Solution**:
1. Create ErrorBoundary component
2. Wrap main app sections with error boundaries
3. Add retry mechanism
4. Log errors to remote service (Sentry)

**Implementation**:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error boundary caught error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Button title="Try Again" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}
```

**Where to Add**:
- Wrap each main navigator section
- Wrap critical features (prayers, devotionals, events)
- Add to App.tsx as top-level error boundary

---

### 12. Generic Loading States
**Status**: Not started
**Impact**: Low - UX improvement
**Effort**: Medium

**Problem**: Only shows generic `ActivityIndicator` spinners. No skeleton loading screens for better perceived performance.

**Solution**:
1. Create skeleton loading components for each content type
2. Replace spinners with skeletons during data loading
3. Add shimmer effect for visual polish

**Components to Create**:
- `PrayerCardSkeleton`
- `DevotionalCardSkeleton`
- `EventCardSkeleton`
- `ProfileSkeleton`

**Example**:
```typescript
const PrayerCardSkeleton = () => (
  <View style={styles.skeleton}>
    <ShimmerPlaceholder style={styles.avatar} />
    <View style={styles.content}>
      <ShimmerPlaceholder style={styles.title} />
      <ShimmerPlaceholder style={styles.text} />
    </View>
  </View>
);
```

**Libraries to Consider**:
- `react-native-shimmer-placeholder`
- `react-native-skeleton-content`

---

### 13. No Remote Logging/Analytics
**Status**: Not started
**Impact**: High - Difficult to debug production issues
**Effort**: Low

**Problem**: Logger utility is prepared but not configured for remote logging. Can't debug production crashes or track user issues.

**Solution**:
1. Integrate Sentry for error tracking
2. Add LogRocket for session replay (optional)
3. Configure logger to send errors to remote service
4. Add breadcrumbs for debugging context

**Sentry Setup**:
```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative
```

**Configuration**:
```typescript
// App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0,
});

// Wrap app with Sentry profiler
export default Sentry.wrap(App);
```

**Logger Integration**:
```typescript
// src/lib/logger.ts
import * as Sentry from '@sentry/react-native';

export const logger = {
  error: (message: string, error?: Error, context?: any) => {
    console.error(message, error, context);

    if (!__DEV__) {
      Sentry.captureException(error || new Error(message), {
        contexts: { custom: context },
      });
    }
  },
  // ... other methods
};
```

---

## 📝 CODE QUALITY IMPROVEMENTS

### Consolidate Console Statements
**Impact**: Low
**Effort**: Low

**Problem**: ~140 direct `console.log/error` calls throughout codebase instead of using logger utility.

**Files**:
- `src/lib/devotionalApi.ts:63, 76, 124`
- Multiple screen components
- Query hooks

**Solution**: Replace all `console.*` calls with logger utility for consistency.

---

### Standardize Import Paths
**Impact**: Low
**Effort**: Low

**Problem**: ~194 relative imports (e.g., `../../lib/supabase`) instead of path aliases.

**Solution**:
1. Configure `tsconfig.json` with path aliases
2. Update imports to use `@/lib/supabase`
3. Better code organization and refactoring

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@lib/*": ["src/lib/*"]
    }
  }
}
```

---

### Split Large Files
**Impact**: Low
**Effort**: Medium

**Problem**: Some files exceed recommended complexity:
- `src/store/useAppStore.ts` - 413 lines
- `src/context/AuthContext.tsx` - 432 lines

**Solution**: Break into smaller, focused modules.

---

## 🧪 TESTING IMPROVEMENTS

### Expand Test Coverage
**Current**: 50% threshold, only 3 test files
**Target**: 70%+ coverage

**Tests to Add**:
1. **Unit Tests** (Priority: High)
   - All query hooks (`useDevotionalsQuery`, `usePrayersQuery`, `useEventsQuery`)
   - All mutation hooks
   - Validation utilities (`src/lib/validation.ts`)
   - Date utilities, file validation, rate limiter

2. **Integration Tests** (Priority: High)
   - Auth flows (sign up, sign in, sign out)
   - Supabase query operations
   - Realtime subscription handling

3. **Component Tests** (Priority: Medium)
   - Critical UI components (Button, Input, Card)
   - Screen components with user interactions
   - Modal dialogs

4. **E2E Tests** (Priority: Low - Future)
   - Complete user journey: sign up → join group → post devotional
   - Prayer request flow
   - Event creation and RSVP flow

**Testing Setup**:
```bash
# Already configured
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Example Test**:
```typescript
// src/lib/__tests__/validation.test.ts
import { validatePassword } from '../validation';

describe('validatePassword', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Short1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  it('should require uppercase letter', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('uppercase');
  });

  it('should accept valid passwords', () => {
    const result = validatePassword('Valid123');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
```

---

## 📊 PERFORMANCE IMPROVEMENTS

### Add React DevTools Profiler Analysis
**Impact**: Medium
**Effort**: Low

**Action**: Use React DevTools Profiler to identify unnecessary re-renders and optimize components with `React.memo`, `useMemo`, and `useCallback`.

---

### Optimize Image Loading
**Impact**: Medium
**Effort**: Low

**Action**:
1. Implement image compression before upload
2. Add progressive loading for images
3. Use thumbnail versions for list views
4. Implement image caching strategy

---

### Add Database Indexes
**Impact**: High
**Effort**: Low

**Action**: Verify Supabase has proper indexes on:
- `devotionals.group_id`
- `devotionals.post_date`
- `prayers.group_id`
- `prayers.created_at`
- `events.group_id`
- `events.event_date`

---

## 🔒 SECURITY ENHANCEMENTS

### Add Input Length Limits
**Impact**: Low
**Effort**: Low

**Action**: Add maximum length validation to all text inputs to prevent abuse.

---

### Add CSRF Protection
**Impact**: Medium
**Effort**: Medium

**Action**: If adding custom API endpoints, implement CSRF token validation.

---

### Review RLS Policies
**Impact**: High
**Effort**: Medium

**Action**: Audit all Supabase Row Level Security policies to ensure proper data isolation between groups.

---

## 📱 MOBILE-SPECIFIC IMPROVEMENTS

### Add Haptic Feedback
**Impact**: Low - UX improvement
**Effort**: Low

**Action**: Add tactile feedback for important actions (like, delete, answered prayer).

---

### Implement Deep Linking
**Impact**: Medium
**Effort**: Medium

**Action**: Add deep linking support for sharing prayers, events, devotionals.

---

### Add Share Functionality
**Impact**: Medium
**Effort**: Low

**Action**: Allow users to share prayers, events, devotional posts outside the app.

---

## 🎨 UI/UX ENHANCEMENTS

### Add Pull-to-Refresh Consistency
**Impact**: Low
**Effort**: Low

**Action**: Ensure all list screens support pull-to-refresh.

---

### Improve Empty States
**Impact**: Low
**Effort**: Low

**Action**: Add helpful guidance and CTAs to empty state screens.

---

### Add Confirmation Dialogs
**Impact**: Medium
**Effort**: Low

**Action**: Add confirmation dialogs for destructive actions (delete prayer, leave group).

---

## 📖 DOCUMENTATION

### Add Inline JSDoc Comments
**Impact**: Low
**Effort**: Medium

**Action**: Document all utility functions with JSDoc comments including parameters, return types, and examples.

---

### Create Troubleshooting Guide
**Impact**: Medium
**Effort**: Low

**Action**: Document common issues:
- Network timeout errors
- Auth failures
- Image upload issues
- Push notification setup

---

### Document Error Codes
**Impact**: Low
**Effort**: Low

**Action**: Create reference for all error codes like `RATE_LIMIT_EXCEEDED`.

---

## ✅ IMPLEMENTATION PRIORITY

**Phase 1** (Next 2 weeks):
1. Expand test coverage to 70%
2. Add accessibility labels
3. Replace `any` types with proper TypeScript

**Phase 2** (Next month):
1. Implement pagination
2. Add error boundaries
3. Set up Sentry for remote logging

**Phase 3** (Next quarter):
1. Server-side rate limiting
2. Skeleton loading screens
3. E2E test suite with Detox

---

_Last Updated: January 2026_
