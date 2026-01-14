import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  Profile, 
  Group, 
  GroupMember, 
  UserPreferences,
  GroupMemberWithProfile 
} from '../types/database';
import { Session } from '@supabase/supabase-js';
import { withTimeout } from '../lib/asyncUtils';

interface AppState {
  // Auth
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // Group
  currentGroup: Group | null;
  groupMembers: GroupMemberWithProfile[];
  currentUserRole: 'admin' | 'member' | null;
  
  // Preferences
  preferences: UserPreferences | null;
  
  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCurrentGroup: (group: Group | null) => void;
  setGroupMembers: (members: GroupMemberWithProfile[]) => void;
  setPreferences: (preferences: UserPreferences | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Async actions
  fetchProfile: () => Promise<void>;
  fetchCurrentGroup: () => Promise<void>;
  fetchGroupMembers: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Onboarding
  createGroup: (name: string, description?: string) => Promise<Group>;
  joinGroup: (inviteCode: string) => Promise<Group>;
  
  // Group management
  updateGroupName: (name: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  currentGroup: null,
  groupMembers: [],
  currentUserRole: null,
  preferences: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setCurrentGroup: (group) => set({ currentGroup: group }),
  setGroupMembers: (members) => set({ groupMembers: members }),
  setPreferences: (preferences) => set({ preferences }),
  setLoading: (loading) => set({ isLoading: loading }),

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        15000,
        'Failed to fetch profile: timeout'
      );

      if (error) {
        console.warn('Error fetching profile:', error.message);
        // Don't throw - allow app to continue without profile
        return;
      }

      if (data) {
        set({ profile: data });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't throw - allow app to continue
    }
  },

  fetchCurrentGroup: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      // Get the user's first group membership with role
      const { data: membership, error: memberError } = await withTimeout(
        supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', session.user.id)
          .limit(1)
          .single(),
        15000,
        'Failed to fetch group membership: timeout'
      );

      if (memberError || !membership) {
        // User has no group - this is valid, not an error
        set({ currentGroup: null, currentUserRole: null });
        return;
      }

      const { data: group, error } = await withTimeout(
        supabase
          .from('groups')
          .select('*')
          .eq('id', membership.group_id)
          .single(),
        15000,
        'Failed to fetch group: timeout'
      );

      if (error) {
        console.warn('Error fetching group:', error.message);
        set({ currentGroup: null, currentUserRole: null });
        return;
      }

      if (group) {
        set({ 
          currentGroup: group,
          currentUserRole: membership.role as 'admin' | 'member' | null
        });
      }
    } catch (error) {
      console.error('Error fetching current group:', error);
      // Set to null to allow app to continue (user will see onboarding)
      set({ currentGroup: null, currentUserRole: null });
    }
  },

  fetchGroupMembers: async () => {
    const { currentGroup } = get();
    if (!currentGroup?.id) return;

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        profiles (*)
      `)
      .eq('group_id', currentGroup.id);

    if (data && !error) {
      set({ groupMembers: data as GroupMemberWithProfile[] });
    }
  },

  fetchPreferences: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single(),
        15000,
        'Failed to fetch preferences: timeout'
      );

      if (error) {
        console.warn('Error fetching preferences:', error.message);
        // Don't throw - preferences are optional
        return;
      }

      if (data) {
        set({ preferences: data });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Don't throw - preferences are optional
    }
  },

  updatePreferences: async (updates) => {
    const { session, preferences } = get();
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (data && !error) {
      set({ preferences: data });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ 
      session: null, 
      profile: null, 
      currentGroup: null, 
      groupMembers: [],
      currentUserRole: null,
      preferences: null 
    });
  },

  createGroup: async (name, description) => {
    const { session } = get();
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (groupError || !group) {
      throw new Error(groupError?.message || 'Failed to create group');
    }

    // Add user as admin member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'admin',
      });

    if (memberError) {
      throw new Error(memberError.message);
    }

    // Create default challenge
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    await supabase
      .from('challenges')
      .insert({
        group_id: group.id,
        title: 'Read your devotional every morning',
        description: 'Start each day with God\'s Word and share your reflections with the group.',
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
      });

    set({ currentGroup: group });
    return group;
  },

  joinGroup: async (inviteCode) => {
    const { session } = get();
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Find the group by invite code
    const { data: groups, error: findError } = await supabase
      .rpc('get_group_by_invite_code', { code: inviteCode.toUpperCase() });

    if (findError || !groups || groups.length === 0) {
      throw new Error('Invalid invite code');
    }

    const group = groups[0];

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', session.user.id)
      .single();

    if (existing) {
      // Already a member, just set as current group
      const { data: fullGroup } = await supabase
        .from('groups')
        .select('*')
        .eq('id', group.id)
        .single();
      
      if (fullGroup) {
        set({ currentGroup: fullGroup });
        return fullGroup;
      }
      throw new Error('Failed to fetch group');
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'member',
      });

    if (memberError) {
      throw new Error(memberError.message);
    }

    // Fetch full group data
    const { data: fullGroup, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', group.id)
      .single();

    if (fetchError || !fullGroup) {
      throw new Error('Failed to fetch group');
    }

    set({ currentGroup: fullGroup });
    return fullGroup;
  },

  updateGroupName: async (name) => {
    const { currentGroup, currentUserRole } = get();
    if (!currentGroup?.id) throw new Error('No group selected');
    if (currentUserRole !== 'admin') throw new Error('Only admins can update the group name');

    const { data, error } = await supabase
      .from('groups')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentGroup.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update group name');
    }

    if (data) {
      set({ currentGroup: data });
    }
  },

  leaveGroup: async () => {
    const { session, currentGroup } = get();
    if (!session?.user?.id) throw new Error('Not authenticated');
    if (!currentGroup?.id) throw new Error('No group selected');

    // Delete the user's membership
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', currentGroup.id)
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error(error.message || 'Failed to leave group');
    }

    // Clear group state - user will be redirected to onboarding
    set({ 
      currentGroup: null,
      groupMembers: [],
      currentUserRole: null
    });
  },
}));

