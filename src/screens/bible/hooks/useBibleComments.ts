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
    const { count, error } = await supabase
      .from('bible_comments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('book', book);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting book comment count:', error);
    return 0;
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
    const { count, error } = await supabase
      .from('bible_comments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('book', book)
      .eq('chapter', chapter);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting chapter comment count:', error);
    return 0;
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

/**
 * Hook to get comment counts for multiple books
 */
export const useBookCommentCounts = (
  books: string[],
  groupId: string | null
) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || books.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);
      const countsMap: Record<string, number> = {};

      await Promise.all(
        books.map(async (book) => {
          const count = await getBookCommentCount(book, groupId);
          countsMap[book] = count;
        })
      );

      setCounts(countsMap);
      setLoading(false);
    };

    fetchCounts();
  }, [books, groupId]);

  return { counts, loading };
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

  useEffect(() => {
    if (!groupId || !book || chapterCount === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);
      const countsMap: Record<number, number> = {};

      await Promise.all(
        Array.from({ length: chapterCount }, (_, i) => i + 1).map(async (chapter) => {
          const count = await getChapterCommentCount(book, chapter, groupId);
          countsMap[chapter] = count;
        })
      );

      setCounts(countsMap);
      setLoading(false);
    };

    fetchCounts();
  }, [book, chapterCount, groupId]);

  return { counts, loading };
};
