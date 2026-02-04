// Scripture citation parser utility
// Parses citations like "Nehemiah 6:1-9" or "1 Timothy 6:6-12, 17-19" into structured data

import { bibleBooks } from '../data/bibleBooks';

export interface ParsedScripture {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

/**
 * Parse verse ranges string (e.g. "6-12, 17-19" or "6-12") into [start, end] pairs.
 * Same chapter is implied for all ranges.
 */
const parseVerseRanges = (rangesStr: string): Array<{ start: number; end: number }> | null => {
  const trimmed = rangesStr.trim();
  if (!trimmed) return null;

  const rangePattern = /^\d+(?:-\d+)?$/;
  const parts = trimmed.split(',').map((p) => p.trim());
  const ranges: Array<{ start: number; end: number }> = [];

  for (const part of parts) {
    if (!rangePattern.test(part)) return null;
    const dashIdx = part.indexOf('-');
    if (dashIdx === -1) {
      const v = parseInt(part, 10);
      ranges.push({ start: v, end: v });
    } else {
      const start = parseInt(part.slice(0, dashIdx), 10);
      const end = parseInt(part.slice(dashIdx + 1), 10);
      if (end < start) return null;
      ranges.push({ start, end });
    }
  }

  return ranges.length > 0 ? ranges : null;
};

/**
 * Parse a scripture citation that may contain multiple verse ranges in the same chapter.
 * Handles formats like:
 * - "1 Timothy 6:6-12, 17-19" (multiple ranges)
 * - "Nehemiah 6:1-9" (single range)
 * - "John 3:16" (single verse)
 * Returns array of ParsedScripture (one per range), or null if unparseable.
 */
export const parseScriptureCitationRanges = (citation: string): ParsedScripture[] | null => {
  if (!citation || typeof citation !== 'string') {
    return null;
  }

  const cleaned = citation.trim();

  // Match: BookName Chapter:VerseRanges (verse ranges can be "6-12, 17-19" or "1-9")
  // Greedy first group so "1 Timothy" is captured as book, not "1"
  const pattern = /^(.+)\s+(\d+):([\d\s,-]+)$/;
  const match = cleaned.match(pattern);
  if (!match) {
    return null;
  }

  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const ranges = parseVerseRanges(match[3]);
  if (!ranges) {
    return null;
  }

  const book = bibleBooks.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
  const canonicalBook = book ? book.name : bookName;

  return ranges.map(({ start, end }) => ({
    book: canonicalBook,
    chapter,
    startVerse: start,
    endVerse: end,
  }));
};

/**
 * Parse a scripture citation string into structured components (single range).
 * Handles formats like:
 * - "Nehemiah 6:1-9" (verse range)
 * - "Nehemiah 6:9" (single verse)
 * - "1 Timothy 6:6-12, 17-19" (multiple ranges: returns first range only)
 */
export const parseScriptureCitation = (citation: string): ParsedScripture | null => {
  const ranges = parseScriptureCitationRanges(citation);
  if (!ranges || ranges.length === 0) {
    console.warn(`Could not parse scripture citation: ${citation}`);
    return null;
  }
  return ranges[0];
};

/**
 * Format a parsed scripture back into a citation string
 */
export const formatScriptureCitation = (parsed: ParsedScripture): string => {
  if (parsed.startVerse === parsed.endVerse) {
    return `${parsed.book} ${parsed.chapter}:${parsed.startVerse}`;
  }
  return `${parsed.book} ${parsed.chapter}:${parsed.startVerse}-${parsed.endVerse}`;
};
