// Hook for managing Bible verse comments and comment counts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface BibleComment {
  id: string;
  group_id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

/**
 * Get comment count for a specific book
 */
export const getBookCommentCount = async (
  book: string,
  groupId: string
): Promise<number> => {
  try {
    if (!groupId || !book) {
      return 0;
    }

    const { count, error } = await supabase
      .from('bible_comments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('book', book);

    if (error) {
      console.error('Error getting book comment count:', {
        error,
        book,
        groupId,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code,
      });
      return 0; // Return 0 instead of throwing to prevent breaking the UI
    }
    return count || 0;
  } catch (error: any) {
    console.error('Error getting book comment count (catch):', {
      error,
      book,
      groupId,
      errorMessage: error?.message,
      errorString: String(error),
    });
    return 0;
  }
};

/**
 * Get comment counts for multiple books in a single optimized query
 * This is much faster than making individual queries for each book
 */
export const getBookCommentCounts = async (
  books: string[],
  groupId: string
): Promise<Record<string, number>> => {
  try {
    if (!groupId || books.length === 0) {
      return {};
    }

    // Fetch all comments for the group and filter by books
    const { data, error } = await supabase
      .from('bible_comments')
      .select('book')
      .eq('group_id', groupId)
      .in('book', books);

    if (error) {
      console.error('Error getting book comment counts:', {
        error,
        books,
        groupId,
        errorMessage: error.message,
      });
      return {};
    }

    // Count comments per book
    const countsMap: Record<string, number> = {};
    books.forEach((book) => {
      countsMap[book] = 0;
    });

    if (data) {
      data.forEach((comment) => {
        if (comment.book && countsMap[comment.book] !== undefined) {
          countsMap[comment.book] = (countsMap[comment.book] || 0) + 1;
        }
      });
    }

    return countsMap;
  } catch (error: any) {
    console.error('Error getting book comment counts (catch):', {
      error,
      books,
      groupId,
      errorMessage: error?.message,
    });
    return {};
  }
};

/**
 * Get comment count for a specific chapter
 */
export const getChapterCommentCount = async (
  book: string,
  chapter: number,
  groupId: string
): Promise<number> => {
  try {
    if (!groupId || !book || !chapter) {
      return 0;
    }

    const { count, error } = await supabase
      .from('bible_comments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('book', book)
      .eq('chapter', chapter);

    if (error) {
      console.error('Error getting chapter comment count:', error);
      return 0;
    }
    return count || 0;
  } catch (error) {
    console.error('Error getting chapter comment count:', error);
    return 0;
  }
};

/**
 * Get comment counts for all chapters in a book in a single optimized query
 */
export const getChapterCommentCounts = async (
  book: string,
  chapterCount: number,
  groupId: string
): Promise<Record<number, number>> => {
  try {
    if (!groupId || !book || chapterCount === 0) {
      return {};
    }

    // Fetch all comments for the book and group
    const { data, error } = await supabase
      .from('bible_comments')
      .select('chapter')
      .eq('group_id', groupId)
      .eq('book', book);

    if (error) {
      console.error('Error getting chapter comment counts:', error);
      return {};
    }

    // Count comments per chapter
    const countsMap: Record<number, number> = {};
    for (let i = 1; i <= chapterCount; i++) {
      countsMap[i] = 0;
    }

    if (data) {
      data.forEach((comment) => {
        if (comment.chapter && countsMap[comment.chapter] !== undefined) {
          countsMap[comment.chapter] = (countsMap[comment.chapter] || 0) + 1;
        }
      });
    }

    return countsMap;
  } catch (error: any) {
    console.error('Error getting chapter comment counts (catch):', error);
    return {};
  }
};

/**
 * Check if a verse has comments
 */
export const getVerseCommentCount = async (
  book: string,
  chapter: number,
  verse: number,
  groupId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('bible_comments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('verse', verse);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting verse comment count:', error);
    return 0;
  }
};

/**
 * Get set of verse numbers that have comments in a chapter
 */
export const getVersesWithComments = async (
  book: string,
  chapter: number,
  groupId: string
): Promise<Set<number>> => {
  try {
    const { data, error } = await supabase
      .from('bible_comments')
      .select('verse')
      .eq('group_id', groupId)
      .eq('book', book)
      .eq('chapter', chapter);

    if (error) throw error;

    const verseNumbers = new Set<number>();
    data?.forEach(comment => {
      verseNumbers.add(comment.verse);
    });

    return verseNumbers;
  } catch (error) {
    console.error('Error getting verses with comments:', error);
    return new Set();
  }
};

/**
 * Get all comments for a specific verse
 */
export const getVerseComments = async (
  book: string,
  chapter: number,
  verse: number,
  groupId: string
): Promise<BibleComment[]> => {
  try {
    const { data, error } = await supabase
      .from('bible_comments')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('verse', verse)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as BibleComment[];
  } catch (error) {
    console.error('Error getting verse comments:', error);
    return [];
  }
};

/**
 * Add a comment to a verse
 */
export const addVerseComment = async (
  book: string,
  chapter: number,
  verse: number,
  content: string,
  groupId: string,
  userId: string
): Promise<BibleComment | null> => {
  try {
    const { data, error } = await supabase
      .from('bible_comments')
      .insert({
        group_id: groupId,
        user_id: userId,
        book,
        chapter,
        verse,
        content,
      })
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data as BibleComment;
  } catch (error) {
    console.error('Error adding verse comment:', error);
    return null;
  }
};

/**
 * Delete a comment
 */
export const deleteVerseComment = async (commentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bible_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting verse comment:', error);
    return false;
  }
};

// Cache duration: 2 minutes for comment counts
const COMMENT_COUNTS_CACHE_DURATION_MS = 2 * 60 * 1000;

// Global cache for book comment counts (persists across hook instances)
const bookCountsCache = new Map<string, { data: Record<string, number>; timestamp: number }>();

// Global cache for chapter comment counts (persists across hook instances)
const chapterCountsCache = new Map<string, { data: Record<number, number>; timestamp: number }>();

/**
 * Hook to get comment counts for multiple books
 */
export const useBookCommentCounts = (
  books: string[],
  groupId: string | null
) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async (forceRefresh = false) => {
    if (!groupId || books.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    // Create cache key from books and groupId
    const cacheKey = `${groupId}-${books.sort().join(',')}`;
    const now = Date.now();
    const cached = bookCountsCache.get(cacheKey);

    // Check cache first
    if (!forceRefresh && cached && (now - cached.timestamp) < COMMENT_COUNTS_CACHE_DURATION_MS) {
      setCounts(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use optimized single query instead of multiple individual queries
      const countsMap = await getBookCommentCounts(books, groupId);
      setCounts(countsMap);
      // Cache the result
      bookCountsCache.set(cacheKey, { data: countsMap, timestamp: now });
    } catch (error) {
      console.error('Error fetching book comment counts:', error);
      // Fallback to empty counts on error
      const emptyCounts: Record<string, number> = {};
      books.forEach((book) => {
        emptyCounts[book] = 0;
      });
      setCounts(emptyCounts);
    } finally {
      setLoading(false);
    }
  }, [books, groupId]);

  useEffect(() => {
    // Check cache first before fetching
    const cacheKey = `${groupId}-${books.sort().join(',')}`;
    const now = Date.now();
    const cached = bookCountsCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < COMMENT_COUNTS_CACHE_DURATION_MS) {
      setCounts(cached.data);
      setLoading(false);
      // Still fetch in background to ensure data is fresh
      fetchCounts(false);
      return;
    }

    // No cache or stale - fetch with loading
    fetchCounts(false);
  }, [fetchCounts, groupId, books.join(',')]);

  return { counts, loading, refetch: () => fetchCounts(true) };
};

/**
 * Hook to get comment counts for chapters in a book
 */
export const useChapterCommentCounts = (
  book: string,
  chapterCount: number,
  groupId: string | null
) => {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async (forceRefresh = false) => {
    if (!groupId || !book || chapterCount === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    // Create cache key from book, chapterCount, and groupId
    const cacheKey = `${groupId}-${book}-${chapterCount}`;
    const now = Date.now();
    const cached = chapterCountsCache.get(cacheKey);

    // Check cache first
    if (!forceRefresh && cached && (now - cached.timestamp) < COMMENT_COUNTS_CACHE_DURATION_MS) {
      setCounts(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use optimized single query instead of multiple individual queries
      const countsMap = await getChapterCommentCounts(book, chapterCount, groupId);
      setCounts(countsMap);
      // Cache the result
      chapterCountsCache.set(cacheKey, { data: countsMap, timestamp: now });
    } catch (error) {
      console.error('Error fetching chapter comment counts:', error);
      // Fallback to empty counts on error
      const emptyCounts: Record<number, number> = {};
      for (let i = 1; i <= chapterCount; i++) {
        emptyCounts[i] = 0;
      }
      setCounts(emptyCounts);
    } finally {
      setLoading(false);
    }
  }, [book, chapterCount, groupId]);

  useEffect(() => {
    // Check cache first before fetching
    const cacheKey = `${groupId}-${book}-${chapterCount}`;
    const now = Date.now();
    const cached = chapterCountsCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < COMMENT_COUNTS_CACHE_DURATION_MS) {
      setCounts(cached.data);
      setLoading(false);
      // Still fetch in background to ensure data is fresh
      fetchCounts(false);
      return;
    }

    // No cache or stale - fetch with loading
    fetchCounts(false);
  }, [fetchCounts, groupId, book, chapterCount]);

  return { counts, loading, refetch: () => fetchCounts(true) };
};
