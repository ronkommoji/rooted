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

interface AppState {
  // Auth
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // Group
  currentGroup: Group | null;
  groupMembers: GroupMemberWithProfile[];
  
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
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  currentGroup: null,
  groupMembers: [],
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data && !error) {
      set({ profile: data });
    }
  },

  fetchCurrentGroup: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    // Get the user's first group membership
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single();

    if (memberError || !membership) {
      set({ currentGroup: null });
      return;
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', membership.group_id)
      .single();

    if (group && !error) {
      set({ currentGroup: group });
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

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (data && !error) {
      set({ preferences: data });
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
}));

