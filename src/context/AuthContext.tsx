import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../lib/rateLimiter';
import { withTimeout, allSettledWithTimeout } from '../lib/asyncUtils';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    session,
    setSession,
    isLoading,
    setLoading,
    fetchProfile,
    fetchCurrentGroup,
    fetchPreferences,
    signOut: storeSignOut
  } = useAppStore();

  // Prevent race conditions and concurrent initialization
  const isInitializing = useRef(false);
  const initializationTimeout = useRef<NodeJS.Timeout | null>(null);
  const authStateChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const isHandlingAuthChange = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasInitialized = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const foregroundSafetyTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxLoadingTimeout = 30000; // 30 seconds maximum loading time
  const foregroundSafetyDelayMs = 5000; // 5 seconds safety check after foreground
  const backgroundThresholdMs = 30000; // 30 seconds - consider "long background" after this

  useEffect(() => {
    // Get initial session with comprehensive error handling
    const initializeAuth = async (forceReinitialize = false) => {
      // Prevent concurrent initialization (unless forced)
      if (isInitializing.current && !forceReinitialize) {
        console.warn('Auth initialization already in progress, skipping...');
        return;
      }

      // If already initialized and not forced, skip
      if (hasInitialized.current && !forceReinitialize) {
        console.log('Auth already initialized, skipping...');
        return;
      }

      isInitializing.current = true;

      try {
        // Set a maximum loading timeout as a safety net
        initializationTimeout.current = setTimeout(() => {
          console.warn('Auth initialization exceeded maximum timeout, forcing completion');
          setLoading(false);
          isInitializing.current = false;
          hasInitialized.current = true;
        }, maxLoadingTimeout);

        // Get session with timeout
        const { data: { session }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          10000, // 10 second timeout for session retrieval
          'Failed to get session: timeout'
        );

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          // Continue without session - user will see login screen
          // setSession(null) will set isGroupChecked=true since there's no session
          setSession(null);
          // Still need to clear loading state
          setLoading(false);
          isInitializing.current = false;
          hasInitialized.current = true;
          return;
        }

        setSession(session);

        if (session) {
          // Use allSettledWithTimeout to ensure all operations complete even if some fail
          // This prevents the app from hanging if one fetch fails
          const results = await allSettledWithTimeout([
            fetchProfile(),
            fetchCurrentGroup(),
            fetchPreferences()
          ], 15000); // 15 second timeout per fetch

          // Log any failures but don't block app initialization
          results.forEach((result, index) => {
            if (!result.success) {
              const operationNames = ['fetchProfile', 'fetchCurrentGroup', 'fetchPreferences'];
              console.warn(`Failed to ${operationNames[index]}:`, result.error?.message);
            }
          });
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        // Ensure we don't get stuck on loading screen
        // App will continue with whatever data we have
      } finally {
        // ALWAYS clear loading state, even on error
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
          initializationTimeout.current = null;
        }
        setLoading(false);
        isInitializing.current = false;
        hasInitialized.current = true;
      }
    };

    // Helper to force reset all loading/auth state
    const forceResetLoadingState = (reason: string) => {
      console.log(`Force resetting loading state: ${reason}`);

      // Clear all timeouts
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
        initializationTimeout.current = null;
      }
      if (authStateChangeTimeout.current) {
        clearTimeout(authStateChangeTimeout.current);
        authStateChangeTimeout.current = null;
      }
      if (foregroundSafetyTimeout.current) {
        clearTimeout(foregroundSafetyTimeout.current);
        foregroundSafetyTimeout.current = null;
      }

      // Reset all flags
      isInitializing.current = false;
      isHandlingAuthChange.current = false;

      // Force loading to false
      setLoading(false);
      
      // If there's a session but group check hasn't completed, mark it as checked
      // This is a safety mechanism - app will show with current state (may need to refetch)
      const currentSession = useAppStore.getState().session;
      const isGroupChecked = useAppStore.getState().isGroupChecked;
      if (currentSession && !isGroupChecked) {
        console.warn('Force reset: marking group as checked to prevent infinite loading');
        useAppStore.getState().setGroupChecked(true);
      }
    };

    // Handle app state changes (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Track when app goes to background
      if (nextAppState.match(/inactive|background/) && appState.current === 'active') {
        backgroundedAt.current = Date.now();
        console.log('App went to background');
      }

      // When app comes to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App came to foreground, checking auth state...');

        // Calculate how long we were in background
        const timeInBackground = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : 0;
        console.log(`Time in background: ${timeInBackground}ms`);

        // IMPORTANT: Get current loading state from store directly, not from closure
        const currentIsLoading = useAppStore.getState().isLoading;

        // If currently loading, reset immediately
        if (currentIsLoading) {
          forceResetLoadingState('was loading when returning to foreground');
        }

        // Always reset stuck flags when returning from long background
        if (timeInBackground > backgroundThresholdMs) {
          console.log('Long background detected, resetting stuck flags...');
          isInitializing.current = false;
          isHandlingAuthChange.current = false;

          // Clear any pending auth state change timeout to prevent it from setting loading=true
          if (authStateChangeTimeout.current) {
            clearTimeout(authStateChangeTimeout.current);
            authStateChangeTimeout.current = null;
          }
        }

        // Set up a safety timeout - if we're STILL loading after a few seconds, force reset
        // This catches cases where auth state change fires AFTER this handler
        if (foregroundSafetyTimeout.current) {
          clearTimeout(foregroundSafetyTimeout.current);
        }
        foregroundSafetyTimeout.current = setTimeout(() => {
          const stillLoading = useAppStore.getState().isLoading;
          if (stillLoading) {
            forceResetLoadingState('safety timeout - still loading after foreground');
          }
          foregroundSafetyTimeout.current = null;
        }, foregroundSafetyDelayMs);

        backgroundedAt.current = null;
      }

      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    initializeAuth();

    // Prevent concurrent auth state change handling
    const handleAuthStateChange = async (event: string, newSession: Session | null) => {
      // Skip if we're still initializing or already handling a change
      if (isInitializing.current || isHandlingAuthChange.current) {
        console.log('Skipping auth state change - initialization or previous change in progress');
        return;
      }

      // Clear any pending timeout
      if (authStateChangeTimeout.current) {
        clearTimeout(authStateChangeTimeout.current);
      }

      // Check if this is a TOKEN_REFRESHED event after returning from background
      // In this case, we don't need to refetch data - just update the session
      const isTokenRefresh = event === 'TOKEN_REFRESHED';
      const currentSession = useAppStore.getState().session;
      const sessionUserUnchanged = currentSession?.user?.id === newSession?.user?.id;

      // If it's just a token refresh and user is the same, skip expensive refetch
      if (isTokenRefresh && sessionUserUnchanged && newSession) {
        console.log('Token refreshed, skipping data refetch (session user unchanged)');
        setSession(newSession);
        return;
      }

      // Debounce rapid auth state changes
      authStateChangeTimeout.current = setTimeout(async () => {
        isHandlingAuthChange.current = true;

        try {
          // Only set loading if we're actually going to fetch data
          // and the session is changing (not just refreshing)
          const needsDataFetch = newSession && !sessionUserUnchanged;

          if (needsDataFetch) {
            setLoading(true);
          }

          setSession(newSession);

          if (newSession && needsDataFetch) {
            // Fetch all user data before showing the app
            // Use allSettledWithTimeout to handle failures gracefully
            const results = await allSettledWithTimeout([
              fetchProfile(),
              fetchCurrentGroup(),
              fetchPreferences()
            ], 15000);

            // Log any failures but don't block
            results.forEach((result, index) => {
              if (!result.success) {
                const operationNames = ['fetchProfile', 'fetchCurrentGroup', 'fetchPreferences'];
                console.warn(`Failed to ${operationNames[index]} during auth change:`, result.error?.message);
              }
            });
          }
          // Note: When newSession is null (sign out), setSession(null) already handles
          // setting isGroupChecked=true and clearing group state
        } catch (error) {
          console.error('Error handling auth state change:', error);
        } finally {
          // ALWAYS clear loading state
          setLoading(false);
          isHandlingAuthChange.current = false;
        }
      }, 300); // 300ms debounce
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        handleAuthStateChange(event, newSession);
      }
    );

    return () => {
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
        initializationTimeout.current = null;
      }
      if (authStateChangeTimeout.current) {
        clearTimeout(authStateChangeTimeout.current);
        authStateChangeTimeout.current = null;
      }
      if (foregroundSafetyTimeout.current) {
        clearTimeout(foregroundSafetyTimeout.current);
        foregroundSafetyTimeout.current = null;
      }
      appStateSubscription.remove();
      subscription.unsubscribe();
      isInitializing.current = false;
      isHandlingAuthChange.current = false;
      hasInitialized.current = false;
      backgroundedAt.current = null;
    };
    // Note: We intentionally don't include isLoading in deps anymore
    // because we now read it directly from the store via getState()
  }, [setSession, setLoading, fetchProfile, fetchCurrentGroup, fetchPreferences]);

  const signUp = async (email: string, password: string) => {
    // Check rate limit before attempting signup
    const rateLimitCheck = await checkRateLimit(email, {
      maxAttempts: 3, // Stricter limit for signup
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      minDelayMs: 2000, // 2 seconds between attempts
    });

    if (!rateLimitCheck.allowed) {
      const error = new Error(rateLimitCheck.message);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = rateLimitCheck.retryAfter;
      throw error;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // Record failed attempt for rate limiting
        await recordFailedAttempt(email, {
          maxAttempts: 3,
          windowMs: 15 * 60 * 1000,
          blockDurationMs: 30 * 60 * 1000,
        });
        throw error;
      }

      // Clear rate limit on successful signup
      await clearRateLimit(email);
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit before attempting signin
    const rateLimitCheck = await checkRateLimit(email, {
      maxAttempts: 5, // 5 attempts for login
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      minDelayMs: 1000, // 1 second between attempts
    });

    if (!rateLimitCheck.allowed) {
      const error = new Error(rateLimitCheck.message);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = rateLimitCheck.retryAfter;
      throw error;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed attempt for rate limiting
        // Only count actual authentication failures, not network errors
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('User not found')) {
          await recordFailedAttempt(email, {
            maxAttempts: 5,
            windowMs: 15 * 60 * 1000,
            blockDurationMs: 30 * 60 * 1000,
          });
        }
        throw error;
      }

      // Clear rate limit on successful signin
      await clearRateLimit(email);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await storeSignOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

