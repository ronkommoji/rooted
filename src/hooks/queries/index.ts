/**
 * React Query Hooks
 *
 * Centralized exports for all data fetching and mutation hooks
 */

// Devotionals
export {
  useDevotionalsQuery,
  useUserStreakQuery,
  useDailyCompletionsQuery,
  useAddDevotionalMutation,
  useDeleteDevotionalMutation,
  useToggleLikeMutation,
  useUpdateStreakMutation,
  uploadDevotionalImage,
  type DevotionalWithProfile,
} from './useDevotionalsQuery';

// Daily Devotional (external content)
export {
  useDailyDevotionalContentQuery,
  useCompletionStatusQuery,
  useUpdateCompletionMutation,
  useMarkScriptureCompleteMutation,
  useMarkDevotionalCompleteMutation,
  useMarkPrayerCompleteMutation,
} from './useDailyDevotionalQuery';

// Prayers
export {
  usePrayersQuery,
  useRecentPrayersQuery,
  useCreatePrayerMutation,
  useUpdatePrayerMutation,
  useDeletePrayerMutation,
  useMarkPrayerAnsweredMutation,
  useIncrementPrayerCountMutation,
  type PrayerWithAuthor,
} from './usePrayersQuery';

// Events
export {
  useEventsQuery,
  useRecentEventsQuery,
  useEventRsvpsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useUpsertRsvpMutation,
  type EventWithRsvps,
  type RsvpWithProfile,
} from './useEventsQuery';

// Profile and Groups
export {
  useProfileQuery,
  useCurrentGroupQuery,
  useGroupMembersQuery,
  usePreferencesQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useUpdateGroupNameMutation,
  useLeaveGroupMutation,
  type GroupMemberWithProfile,
  type CurrentGroupData,
} from './useProfileQuery';
