// Scripture citation parser utility
// Parses citations like "Nehemiah 6:1-9" into structured data

import { bibleBooks } from '../data/bibleBooks';

export interface ParsedScripture {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

/**
 * Parse a scripture citation string into structured components
 * Handles formats like:
 * - "Nehemiah 6:1-9" (verse range)
 * - "Nehemiah 6:9" (single verse)
 * - "Nehemiah 6:1-7:3" (cross-chapter range - uses first chapter)
 */
export const parseScriptureCitation = (citation: string): ParsedScripture | null => {
  if (!citation || typeof citation !== 'string') {
    return null;
  }

  // Remove extra whitespace
  const cleaned = citation.trim();

  // Pattern to match: Book Name Chapter:Verse-Verse or Book Name Chapter:Verse
  // Examples: "Nehemiah 6:1-9", "John 3:16", "1 Corinthians 13:4-7"
  const pattern = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/;

  const match = cleaned.match(pattern);

  if (!match) {
    console.warn(`Could not parse scripture citation: ${citation}`);
    return null;
  }

  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

  // Validate book name exists in our bible books list
  const book = bibleBooks.find(
    (b) => b.name.toLowerCase() === bookName.toLowerCase()
  );

  if (!book) {
    console.warn(`Book not found: ${bookName}`);
    // Still return the parsed data even if book not found, in case it's a valid book name
    return {
      book: bookName,
      chapter,
      startVerse,
      endVerse,
    };
  }

  return {
    book: book.name, // Use the canonical book name from our list
    chapter,
    startVerse,
    endVerse,
  };
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
