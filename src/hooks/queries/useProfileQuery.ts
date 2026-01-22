import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { Tables } from '../../types/database';
import { withTimeout } from '../../lib/asyncUtils';

type Profile = Tables<'profiles'>;
type Group = Tables<'groups'>;
type GroupMember = Tables<'group_members'>;
type UserPreferences = Tables<'user_preferences'>;

export interface GroupMemberWithProfile extends GroupMember {
  profiles: Profile;
}

export interface CurrentGroupData {
  group: Group;
  userRole: 'admin' | 'member';
}

// Fetch user profile
const fetchProfile = async (userId: string) => {
  const { data, error } = await withTimeout(
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    15000,
    'Failed to fetch profile: timeout'
  );

  if (error) throw error;
  return data as Profile;
};

// Fetch current group and user role
const fetchCurrentGroup = async (userId: string) => {
  // Get user's group membership
  const { data: memberData, error: memberError } = await withTimeout(
    supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId)
      .maybeSingle(),
    15000,
    'Failed to fetch group membership: timeout'
  );

  if (memberError) throw memberError;
  if (!memberData) return null;

  // Get group details
  const { data: groupData, error: groupError } = await withTimeout(
    supabase
      .from('groups')
      .select('*')
      .eq('id', memberData.group_id)
      .single(),
    15000,
    'Failed to fetch group: timeout'
  );

  if (groupError) throw groupError;

  return {
    group: groupData as Group,
    userRole: memberData.role as 'admin' | 'member',
  };
};

// Fetch group members
const fetchGroupMembers = async (groupId: string) => {
  const { data, error } = await withTimeout(
    supabase
      .from('group_members')
      .select('*, profiles(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true }),
    15000,
    'Failed to fetch group members: timeout'
  );

  if (error) throw error;
  return data as GroupMemberWithProfile[];
};

// Fetch user preferences
const fetchPreferences = async (userId: string) => {
  const { data, error } = await withTimeout(
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    15000,
    'Failed to fetch preferences: timeout'
  );

  if (error) throw error;
  return data as UserPreferences | null;
};

// Hook: Fetch current user profile
export const useProfileQuery = () => {
  const { session } = useAppStore();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook: Fetch current group
export const useCurrentGroupQuery = () => {
  const { session } = useAppStore();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: queryKeys.groups.current(),
    queryFn: () => fetchCurrentGroup(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook: Fetch group members
export const useGroupMembersQuery = (groupId?: string) => {
  const { currentGroup } = useAppStore();
  const effectiveGroupId = groupId || currentGroup?.id;

  return useQuery({
    queryKey: queryKeys.groups.members(effectiveGroupId || ''),
    queryFn: () => fetchGroupMembers(effectiveGroupId!),
    enabled: !!effectiveGroupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook: Fetch user preferences
export const usePreferencesQuery = () => {
  const { session } = useAppStore();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: queryKeys.preferences.current(),
    queryFn: () => fetchPreferences(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation: Update profile
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { session } = useAppStore();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current(),
      });
    },
  });
};

// Mutation: Update preferences
export const useUpdatePreferencesMutation = () => {
  const queryClient = useQueryClient();
  const { session } = useAppStore();

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.preferences.current(),
      });
    },
  });
};

// Mutation: Update group name
export const useUpdateGroupNameMutation = () => {
  const queryClient = useQueryClient();
  const { currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async (newName: string) => {
      const groupId = currentGroup?.id;
      if (!groupId) throw new Error('No group');

      const { data, error } = await supabase
        .from('groups')
        .update({ name: newName })
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.current(),
      });
    },
  });
};

// Mutation: Leave group
export const useLeaveGroupMutation = () => {
  const queryClient = useQueryClient();
  const { session, currentGroup } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      const userId = session?.user?.id;
      const groupId = currentGroup?.id;
      if (!userId || !groupId) throw new Error('No user or group');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all group-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.current(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.all,
      });
    },
  });
};
