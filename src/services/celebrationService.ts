import { supabase } from '../lib/supabase';

export type CelebrationType = 'prayer_answered' | 'all_devotionals_complete';

export interface Celebration {
  id: string;
  group_id: string;
  user_id: string;
  celebration_type: CelebrationType;
  related_id: string | null;
  post_date: string | null;
  created_at: string;
  shown_at: string | null;
}

/**
 * Check if all group members have uploaded devotionals for a given date
 */
export async function checkAllDevotionalsComplete(
  groupId: string,
  postDate: string
): Promise<boolean> {
  try {
    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members) {
      console.error('Error fetching group members:', membersError);
      return false;
    }

    const memberIds = members.map((m) => m.user_id);
    if (memberIds.length === 0) return false;

    // Get all devotionals for this date
    const { data: devotionals, error: devotionalsError } = await supabase
      .from('devotionals')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('post_date', postDate);

    if (devotionalsError) {
      console.error('Error fetching devotionals:', devotionalsError);
      return false;
    }

    const postedUserIds = new Set(devotionals?.map((d) => d.user_id) || []);

    // Check if all members have posted
    const allComplete = memberIds.every((memberId) => postedUserIds.has(memberId));

    return allComplete;
  } catch (error) {
    console.error('Error checking all devotionals complete:', error);
    return false;
  }
}

/**
 * Create celebration records for all group members when all devotionals are complete
 */
export async function createDevotionalCelebration(
  groupId: string,
  postDate: string
): Promise<void> {
  try {
    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members) {
      console.error('Error fetching group members:', membersError);
      return;
    }

    // Check if celebrations already exist for this date
    const { data: existing } = await supabase
      .from('celebrations')
      .select('id')
      .eq('group_id', groupId)
      .eq('celebration_type', 'all_devotionals_complete')
      .eq('post_date', postDate)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already created celebrations for this date
      return;
    }

    // Create celebration for each member
    const celebrations = members.map((member) => ({
      group_id: groupId,
      user_id: member.user_id,
      celebration_type: 'all_devotionals_complete' as CelebrationType,
      related_id: postDate, // Store post_date as related_id
      post_date: postDate,
    }));

    const { error } = await supabase.from('celebrations').insert(celebrations);

    if (error) {
      console.error('Error creating celebrations:', error);
    }
  } catch (error) {
    console.error('Error creating devotional celebration:', error);
  }
}

/**
 * Create celebration record for a prayer being answered
 */
export async function createPrayerAnsweredCelebration(
  groupId: string,
  prayerId: string
): Promise<void> {
  try {
    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members) {
      console.error('Error fetching group members:', membersError);
      return;
    }

    // Check if celebrations already exist for this prayer
    const { data: existing } = await supabase
      .from('celebrations')
      .select('id')
      .eq('related_id', prayerId)
      .eq('celebration_type', 'prayer_answered')
      .limit(1);

    if (existing && existing.length > 0) {
      // Already created celebrations for this prayer
      return;
    }

    // Create celebration for each member
    const celebrations = members.map((member) => ({
      group_id: groupId,
      user_id: member.user_id,
      celebration_type: 'prayer_answered' as CelebrationType,
      related_id: prayerId,
      post_date: null,
    }));

    const { error } = await supabase.from('celebrations').insert(celebrations);

    if (error) {
      console.error('Error creating celebrations:', error);
    }
  } catch (error) {
    console.error('Error creating prayer answered celebration:', error);
  }
}

/**
 * Get pending celebrations for the current user
 */
export async function getPendingCelebrations(userId: string): Promise<Celebration[]> {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<[]>((resolve) => {
      setTimeout(() => resolve([]), 5000); // 5 second timeout
    });

    const queryPromise = supabase
      .from('celebrations')
      .select('*')
      .eq('user_id', userId)
      .is('shown_at', null)
      .order('created_at', { ascending: true });

    const result = await Promise.race([queryPromise, timeoutPromise]);

    if (Array.isArray(result)) {
      return result; // Timeout occurred
    }

    const { data, error } = result as any;

    if (error) {
      console.error('Error fetching pending celebrations:', error);
      return [];
    }

    return (data || []) as Celebration[];
  } catch (error) {
    console.error('Error getting pending celebrations:', error);
    return [];
  }
}

/**
 * Mark a celebration as shown
 */
export async function markCelebrationAsShown(celebrationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('celebrations')
      .update({ shown_at: new Date().toISOString() })
      .eq('id', celebrationId);

    if (error) {
      console.error('Error marking celebration as shown:', error);
    }
  } catch (error) {
    console.error('Error marking celebration as shown:', error);
  }
}
