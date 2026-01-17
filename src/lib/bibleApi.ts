// Bible API integration for fetching verses and chapters from bible-api.com

export interface BibleVerse {
  reference: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export interface BibleChapter {
  reference: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

const BIBLE_API_BASE_URL = 'https://bible-api.com';

/**
 * Format book name for API (lowercase and replace spaces with +)
 * bible-api.com requires lowercase book names
 */
const formatBookName = (bookName: string): string => {
  return bookName.toLowerCase().replace(/\s+/g, '+');
};

/**
 * Fetch a single verse from the Bible API
 */
export const fetchVerse = async (
  book: string,
  chapter: number,
  verse: number
): Promise<BibleVerse | null> => {
  try {
    const formattedBook = formatBookName(book);
    // Note: bible-api.com doesn't support translation parameter
    // It defaults to World English Bible (WEB)
    const url = `${BIBLE_API_BASE_URL}/${formattedBook}+${chapter}:${verse}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: BibleVerse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching verse:', error);
    return null;
  }
};

/**
 * Fetch an entire chapter from the Bible API
 */
export const fetchChapter = async (
  book: string,
  chapter: number
): Promise<BibleChapter | null> => {
  try {
    const formattedBook = formatBookName(book);
    // Note: bible-api.com doesn't support translation parameter
    // It defaults to World English Bible (WEB), not NIV
    // For NIV support, you would need to use a different API like API.Bible
    const url = `${BIBLE_API_BASE_URL}/${formattedBook}+${chapter}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: BibleChapter = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return null;
  }
};

/**
 * Get verse text from a chapter data structure
 */
export const getVerseText = (
  chapterData: BibleChapter | null,
  verseNumber: number
): string | null => {
  if (!chapterData) return null;
  
  const verse = chapterData.verses.find(v => v.verse === verseNumber);
  return verse?.text || null;
};
