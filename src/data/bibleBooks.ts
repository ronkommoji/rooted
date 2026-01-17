// Bible books data - All 66 books with testament classification and chapter counts

export interface BibleBook {
  name: string;
  testament: 'Old' | 'New';
  chapters: number;
}

export const bibleBooks: BibleBook[] = [
  // Old Testament (39 books)
  { name: 'Genesis', testament: 'Old', chapters: 50 },
  { name: 'Exodus', testament: 'Old', chapters: 40 },
  { name: 'Leviticus', testament: 'Old', chapters: 27 },
  { name: 'Numbers', testament: 'Old', chapters: 36 },
  { name: 'Deuteronomy', testament: 'Old', chapters: 34 },
  { name: 'Joshua', testament: 'Old', chapters: 24 },
  { name: 'Judges', testament: 'Old', chapters: 21 },
  { name: 'Ruth', testament: 'Old', chapters: 4 },
  { name: '1 Samuel', testament: 'Old', chapters: 31 },
  { name: '2 Samuel', testament: 'Old', chapters: 24 },
  { name: '1 Kings', testament: 'Old', chapters: 22 },
  { name: '2 Kings', testament: 'Old', chapters: 25 },
  { name: '1 Chronicles', testament: 'Old', chapters: 29 },
  { name: '2 Chronicles', testament: 'Old', chapters: 36 },
  { name: 'Ezra', testament: 'Old', chapters: 10 },
  { name: 'Nehemiah', testament: 'Old', chapters: 13 },
  { name: 'Esther', testament: 'Old', chapters: 10 },
  { name: 'Job', testament: 'Old', chapters: 42 },
  { name: 'Psalm', testament: 'Old', chapters: 150 },
  { name: 'Proverbs', testament: 'Old', chapters: 31 },
  { name: 'Ecclesiastes', testament: 'Old', chapters: 12 },
  { name: 'Song of Solomon', testament: 'Old', chapters: 8 },
  { name: 'Isaiah', testament: 'Old', chapters: 66 },
  { name: 'Jeremiah', testament: 'Old', chapters: 52 },
  { name: 'Lamentations', testament: 'Old', chapters: 5 },
  { name: 'Ezekiel', testament: 'Old', chapters: 48 },
  { name: 'Daniel', testament: 'Old', chapters: 12 },
  { name: 'Hosea', testament: 'Old', chapters: 14 },
  { name: 'Joel', testament: 'Old', chapters: 3 },
  { name: 'Amos', testament: 'Old', chapters: 9 },
  { name: 'Obadiah', testament: 'Old', chapters: 1 },
  { name: 'Jonah', testament: 'Old', chapters: 4 },
  { name: 'Micah', testament: 'Old', chapters: 7 },
  { name: 'Nahum', testament: 'Old', chapters: 3 },
  { name: 'Habakkuk', testament: 'Old', chapters: 3 },
  { name: 'Zephaniah', testament: 'Old', chapters: 3 },
  { name: 'Haggai', testament: 'Old', chapters: 2 },
  { name: 'Zechariah', testament: 'Old', chapters: 14 },
  { name: 'Malachi', testament: 'Old', chapters: 4 },

  // New Testament (27 books)
  { name: 'Matthew', testament: 'New', chapters: 28 },
  { name: 'Mark', testament: 'New', chapters: 16 },
  { name: 'Luke', testament: 'New', chapters: 24 },
  { name: 'John', testament: 'New', chapters: 21 },
  { name: 'Acts', testament: 'New', chapters: 28 },
  { name: 'Romans', testament: 'New', chapters: 16 },
  { name: '1 Corinthians', testament: 'New', chapters: 16 },
  { name: '2 Corinthians', testament: 'New', chapters: 13 },
  { name: 'Galatians', testament: 'New', chapters: 6 },
  { name: 'Ephesians', testament: 'New', chapters: 6 },
  { name: 'Philippians', testament: 'New', chapters: 4 },
  { name: 'Colossians', testament: 'New', chapters: 4 },
  { name: '1 Thessalonians', testament: 'New', chapters: 5 },
  { name: '2 Thessalonians', testament: 'New', chapters: 3 },
  { name: '1 Timothy', testament: 'New', chapters: 6 },
  { name: '2 Timothy', testament: 'New', chapters: 4 },
  { name: 'Titus', testament: 'New', chapters: 3 },
  { name: 'Philemon', testament: 'New', chapters: 1 },
  { name: 'Hebrews', testament: 'New', chapters: 13 },
  { name: 'James', testament: 'New', chapters: 5 },
  { name: '1 Peter', testament: 'New', chapters: 5 },
  { name: '2 Peter', testament: 'New', chapters: 3 },
  { name: '1 John', testament: 'New', chapters: 5 },
  { name: '2 John', testament: 'New', chapters: 1 },
  { name: '3 John', testament: 'New', chapters: 1 },
  { name: 'Jude', testament: 'New', chapters: 1 },
  { name: 'Revelation', testament: 'New', chapters: 22 },
];

// Helper functions
export const getBooksByTestament = (testament: 'Old' | 'New'): BibleBook[] => {
  return bibleBooks.filter(book => book.testament === testament);
};

export const getBookByName = (name: string): BibleBook | undefined => {
  return bibleBooks.find(book => book.name === name);
};

// Format book name for API (replace spaces with +)
export const formatBookNameForApi = (bookName: string): string => {
  return bookName.replace(/\s+/g, '+');
};
