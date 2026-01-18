import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppStore } from '../useAppStore';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase');

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useAppStore.getState();
    act(() => {
      store.setSession(null);
      store.setProfile(null);
      store.setCurrentGroup(null);
      store.setGroupMembers([]);
      store.setPreferences(null);
      store.setLoading(false);
      store.setGroupChecked(false);
    });

    jest.clearAllMocks();
  });

  describe('State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.session).toBe(null);
      expect(result.current.profile).toBe(null);
      expect(result.current.currentGroup).toBe(null);
      expect(result.current.groupMembers).toEqual([]);
      expect(result.current.preferences).toBe(null);
      expect(result.current.currentUserRole).toBe(null);
      expect(result.current.isGroupChecked).toBe(false);
    });

    it('should set session and mark group as checked when session is null', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(null);
      });

      expect(result.current.session).toBe(null);
      expect(result.current.isGroupChecked).toBe(true);
      expect(result.current.currentGroup).toBe(null);
      expect(result.current.currentUserRole).toBe(null);
    });

    it('should set session and mark group as unchecked when session is set', () => {
      const { result } = renderHook(() => useAppStore());

      const mockSession = {
        access_token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isGroupChecked).toBe(false);
    });

    it('should set profile', () => {
      const { result } = renderHook(() => useAppStore());

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as any;

      act(() => {
        result.current.setProfile(mockProfile);
      });

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should set current group', () => {
      const { result } = renderHook(() => useAppStore());

      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        description: 'Test Description',
        invite_code: 'ABC123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as any;

      act(() => {
        result.current.setCurrentGroup(mockGroup);
      });

      expect(result.current.currentGroup).toEqual(mockGroup);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set group checked state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setGroupChecked(true);
      });

      expect(result.current.isGroupChecked).toBe(true);
    });

    it('should set group members', () => {
      const { result } = renderHook(() => useAppStore());

      const mockMembers = [
        {
          id: 'member-1',
          group_id: 'group-123',
          user_id: 'user-1',
          role: 'admin',
          profile: {
            id: 'user-1',
            email: 'user1@example.com',
            full_name: 'User One',
          },
        },
        {
          id: 'member-2',
          group_id: 'group-123',
          user_id: 'user-2',
          role: 'member',
          profile: {
            id: 'user-2',
            email: 'user2@example.com',
            full_name: 'User Two',
          },
        },
      ] as any;

      act(() => {
        result.current.setGroupMembers(mockMembers);
      });

      expect(result.current.groupMembers).toEqual(mockMembers);
      expect(result.current.groupMembers).toHaveLength(2);
    });

    it('should set preferences', () => {
      const { result } = renderHook(() => useAppStore());

      const mockPreferences = {
        user_id: 'user-123',
        notifications_enabled: true,
        theme: 'light',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as any;

      act(() => {
        result.current.setPreferences(mockPreferences);
      });

      expect(result.current.preferences).toEqual(mockPreferences);
    });
  });

  describe('fetchProfile', () => {
    it('should fetch profile successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await result.current.fetchProfile();
      });

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should handle fetch profile errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' },
        }),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await result.current.fetchProfile();
      });

      // Profile should remain null, no error thrown
      expect(result.current.profile).toBe(null);
    });

    it('should not fetch profile when session is null', async () => {
      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.fetchProfile();
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('fetchCurrentGroup', () => {
    it('should fetch current group successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      const mockMembership = {
        group_id: 'group-123',
        role: 'admin',
      };

      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        description: 'Test Description',
      };

      // Mock group_members query
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'group_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null,
            }),
          };
        }
        if (table === 'groups') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await result.current.fetchCurrentGroup();
      });

      expect(result.current.currentGroup).toEqual(mockGroup);
      expect(result.current.currentUserRole).toBe('admin');
      expect(result.current.isGroupChecked).toBe(true);
    });

    it('should handle user with no group', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'No membership found' },
        }),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await result.current.fetchCurrentGroup();
      });

      expect(result.current.currentGroup).toBe(null);
      expect(result.current.currentUserRole).toBe(null);
      expect(result.current.isGroupChecked).toBe(true);
    });

    it('should mark group as checked when no session', async () => {
      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.fetchCurrentGroup();
      });

      expect(result.current.isGroupChecked).toBe(true);
      expect(result.current.currentGroup).toBe(null);
      expect(result.current.currentUserRole).toBe(null);
    });
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      const mockGroup = {
        id: 'new-group-123',
        name: 'New Group',
        description: 'New Description',
        invite_code: 'NEW123',
      };

      // Mock groups insert
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'groups') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          };
        }
        if (table === 'group_members') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      let createdGroup: any;
      await act(async () => {
        createdGroup = await result.current.createGroup('New Group', 'New Description');
      });

      expect(createdGroup).toEqual(mockGroup);
    });

    it('should throw error when group creation fails', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to create group' },
        }),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await expect(
          result.current.createGroup('New Group')
        ).rejects.toThrow('Failed to create group');
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      } as any;

      const mockPreferences = {
        user_id: 'user-123',
        notifications_enabled: true,
        theme: 'dark',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPreferences,
          error: null,
        }),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      await act(async () => {
        await result.current.updatePreferences({ theme: 'dark' });
      });

      expect(result.current.preferences).toEqual(mockPreferences);
    });
  });
});
