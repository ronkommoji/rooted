import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/rateLimiter', () => ({
  checkRateLimit: jest.fn(() => Promise.resolve({ allowed: true, message: '' })),
  recordFailedAttempt: jest.fn(),
  clearRateLimit: jest.fn(),
}));

// Mock AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store
    useAppStore.setState({
      session: null,
      isLoading: false,
      profile: null,
      currentGroup: null,
      preferences: null,
      isGroupChecked: false,
    });
  });

  describe('Provider', () => {
    it('should provide auth context to children', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.session).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
    });

    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      // Mock successful sign in
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle sign in errors', async () => {
      const mockError = { message: 'Invalid credentials' };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('wrong@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should validate email and password are provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(result.current.signIn('', 'password')).rejects.toThrow();
      await expect(result.current.signIn('test@example.com', '')).rejects.toThrow();
    });
  });

  describe('signUp', () => {
    it('should successfully sign up with valid information', async () => {
      const mockUser = { id: 'user-123', email: 'newuser@example.com' };
      const mockSession = {
        access_token: 'test-token',
        user: mockUser,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signUp('newuser@example.com', 'password123', 'John Doe');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should handle sign up errors', async () => {
      const mockError = { message: 'Email already registered' };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('existing@example.com', 'password123', 'John Doe')
      ).rejects.toThrow('Email already registered');
    });

    it('should validate all required fields are provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('', 'password', 'Name')
      ).rejects.toThrow();

      await expect(
        result.current.signUp('email@test.com', '', 'Name')
      ).rejects.toThrow();

      await expect(
        result.current.signUp('email@test.com', 'password', '')
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors gracefully', async () => {
      const mockError = { message: 'Sign out failed' };

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign out should not throw even if it fails
      await expect(result.current.signOut()).resolves.not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should initialize with session from Supabase', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Session should be set in Zustand store
      expect(useAppStore.getState().session).toBeDefined();
    });

    it('should handle session initialization errors', async () => {
      const mockError = { message: 'Failed to get session' };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(useAppStore.getState().isLoading).toBe(false);
      });

      // Should continue without session
      expect(useAppStore.getState().session).toBe(null);
    });
  });
});
