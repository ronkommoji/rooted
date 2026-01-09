import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../lib/rateLimiter';

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

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        // Await all fetches before setting loading to false
        await Promise.all([
          fetchProfile(),
          fetchCurrentGroup(),
          fetchPreferences()
        ]);
      }
      setLoading(false);
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Set loading true BEFORE updating session to prevent flash
        if (session) {
          setLoading(true);
        }
        
        setSession(session);
        
        if (session) {
          // Fetch all user data before showing the app
          await Promise.all([
            fetchProfile(),
            fetchCurrentGroup(),
            fetchPreferences()
          ]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
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
        options: {
          data: {
            full_name: fullName,
          },
        },
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

