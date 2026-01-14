# Loading Screen Bug Analysis

## Problem Description
The app sometimes gets stuck on the loading screen when opened. Closing and reopening the app resolves the issue, suggesting a race condition or initialization problem.

## Root Causes Identified

### 1. **Critical: Missing Error Handling in AuthContext Initialization** ⚠️
**Location:** `src/context/AuthContext.tsx:29-43`

The `initializeAuth` function has no error handling. If any of the network calls fail or hang:
- `setLoading(false)` is never called
- The app remains stuck on the loading screen indefinitely
- No fallback mechanism exists

```typescript
const initializeAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  setSession(session);
  if (session) {
    // If ANY of these fail or hang, loading never completes
    await Promise.all([
      fetchProfile(),
      fetchCurrentGroup(),
      fetchPreferences()
    ]);
  }
  setLoading(false); // Never reached if Promise.all fails/hangs
};
```

**Why it works on second open:** The session might be cached, or network conditions improve, allowing the calls to complete.

### 2. **No Timeout Mechanism for Network Requests** ⚠️
**Location:** `src/store/useAppStore.ts` (all fetch functions)

All Supabase network calls have no timeout. On poor network conditions:
- Requests can hang indefinitely
- No retry logic
- No fallback to cached data

**Affected functions:**
- `fetchProfile()` - Line 67-80
- `fetchCurrentGroup()` - Line 82-111
- `fetchPreferences()` - Line 130-143

### 3. **Race Condition Between Auth Initialization and Auth State Listener** ⚠️
**Location:** `src/context/AuthContext.tsx:29-70`

The `onAuthStateChange` listener is set up immediately, which can fire:
- Before `initializeAuth` completes
- During `initializeAuth` execution
- Causing duplicate fetches and state conflicts

```typescript
useEffect(() => {
  initializeAuth(); // Starts async operation
  
  // This listener can fire BEFORE initializeAuth completes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      // Could interfere with initializeAuth
    }
  );
}, []);
```

### 4. **Silent Failures in Fetch Functions**
**Location:** `src/store/useAppStore.ts`

All fetch functions silently fail without throwing errors:
- If a network request fails, the function just returns
- `Promise.all` doesn't know about failures
- No distinction between "no data" and "error occurred"

Example:
```typescript
fetchProfile: async () => {
  const { data, error } = await supabase.from('profiles')...
  if (data && !error) {
    set({ profile: data });
  }
  // If error, function just returns - no indication of failure
}
```

### 5. **AsyncStorage Operations Can Hang**
**Location:** `src/lib/supabase.ts:7-40`

The custom storage adapter wraps AsyncStorage operations in try-catch but:
- AsyncStorage operations can hang on some devices
- Errors are silently swallowed
- No timeout mechanism

### 6. **Missing Dependency Array Dependencies**
**Location:** `src/context/AuthContext.tsx:70`

The useEffect has an empty dependency array but uses store functions:
```typescript
useEffect(() => {
  // Uses fetchProfile, fetchCurrentGroup, fetchPreferences
  // But these aren't in dependency array
}, []); // Empty array - could cause stale closures
```

### 7. **No Loading State Reset on Errors**
If initialization fails, there's no mechanism to:
- Reset the loading state
- Show an error message
- Allow the user to retry
- Fall back to cached data

## Why It Works on Second Open

1. **Session Caching:** Supabase caches the session, so `getSession()` returns immediately
2. **Network State:** Network conditions may have improved
3. **AsyncStorage Cache:** Some data might be cached from the first attempt
4. **Race Condition Timing:** The timing of the race condition might be different

## Recommended Fixes (Priority Order)

### Priority 1: Add Error Handling and Timeout
1. Wrap `initializeAuth` in try-catch
2. Add timeout wrapper for network requests
3. Always call `setLoading(false)` in a finally block
4. Add retry logic with exponential backoff

### Priority 2: Fix Race Condition
1. Use a flag to prevent concurrent initialization
2. Debounce the auth state change listener
3. Ensure `initializeAuth` completes before setting up listener

### Priority 3: Improve Error Handling in Fetch Functions
1. Throw errors from fetch functions
2. Handle errors in Promise.all with `Promise.allSettled`
3. Add fallback to cached data when network fails

### Priority 4: Add Timeout to Network Requests
1. Create a timeout wrapper utility
2. Apply to all Supabase calls
3. Set reasonable timeout (e.g., 10-15 seconds)

### Priority 5: Add Loading State Management
1. Add maximum loading timeout (e.g., 30 seconds)
2. Show error screen if loading exceeds timeout
3. Allow user to retry or continue with cached data

## Testing Recommendations

1. **Test on poor network conditions:**
   - Airplane mode toggle
   - Slow 3G simulation
   - Network interruption during initialization

2. **Test race conditions:**
   - Rapid app open/close cycles
   - Background/foreground transitions during loading

3. **Test error scenarios:**
   - Invalid session tokens
   - Database connection failures
   - Missing user data

4. **Monitor in production:**
   - Add logging to track initialization time
   - Log errors during initialization
   - Track how often loading screen hangs
