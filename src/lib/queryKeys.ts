/**
 * Query keys for React Query
 *
 * Organized by feature area for easy cache invalidation.
 * Use these constants to ensure consistency and type safety.
 */

export const queryKeys = {
  // Profile and user data
  profile: {
    all: ['profile'] as const,
    byId: (userId: string) => [...queryKeys.profile.all, userId] as const,
    current: () => [...queryKeys.profile.all, 'current'] as const,
  },

  // User preferences
  preferences: {
    all: ['preferences'] as const,
    current: () => [...queryKeys.preferences.all, 'current'] as const,
  },

  // Groups
  groups: {
    all: ['groups'] as const,
    byId: (groupId: string) => [...queryKeys.groups.all, groupId] as const,
    current: () => [...queryKeys.groups.all, 'current'] as const,
    members: (groupId: string) => [...queryKeys.groups.byId(groupId), 'members'] as const,
  },

  // Devotionals
  devotionals: {
    all: ['devotionals'] as const,
    byGroup: (groupId: string) => [...queryKeys.devotionals.all, groupId] as const,
    byDate: (groupId: string, date: string) => [...queryKeys.devotionals.byGroup(groupId), date] as const,
    likes: (groupId: string, date: string) => [...queryKeys.devotionals.byDate(groupId, date), 'likes'] as const,
    completions: (groupId: string, date: string) => [...queryKeys.devotionals.byDate(groupId, date), 'completions'] as const,
  },

  // Daily devotional (external content)
  dailyDevotional: {
    all: ['dailyDevotional'] as const,
    byDate: (date: string) => [...queryKeys.dailyDevotional.all, date] as const,
    completion: (userId: string, date: string) => [...queryKeys.dailyDevotional.byDate(date), 'completion', userId] as const,
  },

  // User streaks
  streaks: {
    all: ['streaks'] as const,
    current: (userId: string) => [...queryKeys.streaks.all, userId] as const,
  },

  // Prayers
  prayers: {
    all: ['prayers'] as const,
    byGroup: (groupId: string) => [...queryKeys.prayers.all, groupId] as const,
    filtered: (groupId: string, isAnswered: boolean | 'all') =>
      [...queryKeys.prayers.byGroup(groupId), 'filtered', isAnswered] as const,
    recent: (groupId: string, limit: number) =>
      [...queryKeys.prayers.byGroup(groupId), 'recent', limit] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    byGroup: (groupId: string) => [...queryKeys.events.all, groupId] as const,
    upcoming: (groupId: string) => [...queryKeys.events.byGroup(groupId), 'upcoming'] as const,
    past: (groupId: string) => [...queryKeys.events.byGroup(groupId), 'past'] as const,
    rsvps: (eventId: string) => [...queryKeys.events.all, eventId, 'rsvps'] as const,
  },

  // Bible comments
  bibleComments: {
    all: ['bibleComments'] as const,
    byGroup: (groupId: string) => [...queryKeys.bibleComments.all, groupId] as const,
    bookCounts: (groupId: string) => [...queryKeys.bibleComments.byGroup(groupId), 'bookCounts'] as const,
    chapterCounts: (groupId: string, book: string) =>
      [...queryKeys.bibleComments.byGroup(groupId), 'chapterCounts', book] as const,
    verseComments: (groupId: string, book: string, chapter: number, verse: number) =>
      [...queryKeys.bibleComments.byGroup(groupId), book, chapter, verse] as const,
  },
} as const;
