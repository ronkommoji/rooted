export const lightTheme = {
  primary: '#3D5A50',      // Deep Sage
  accent: '#E6C68B',       // Golden Wheat
  secondary: '#B9D6D2',    // Mist Blue
  background: '#FAF9F6',   // Light beige (slightly lighter than challenge card)
  text: '#000000',         // Black text (matching image)
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  card: '#FFFFFF',
  cardBorder: '#E8E7E2',
  challengeCard: '#D8D4CA', // Beige/tan for challenge card (much darker for good contrast)
  success: '#4A7C59',
  error: '#C75050',
  warning: '#D4A84B',
};

export const darkTheme = {
  primary: '#B9D6D2',      // Muted green/teal for accents only (matching image)
  accent: '#E6C68B',       // Golden Wheat
  secondary: '#3D5A50',    // Deeper green for secondary accents
  background: '#1E1E1E',   // Very dark gray/black (matching image)
  text: '#FDFBF7',         // Light text (matching image)
  textSecondary: '#B0B0B0', // Muted light gray (matching image)
  textMuted: '#707070',
  card: '#2A2A2A',         // Neutral dark gray for cards (less green, more black)
  cardBorder: '#3A3A3A',   // Neutral dark gray border
  challengeCard: '#2C3A37', // Dark muted green/beige for challenge card only
  avatarBg: '#3A3A3A',     // Neutral dark gray for avatars (not green)
  success: '#5A9C6A',
  error: '#E07070',
  warning: '#E4B85B',
};

export type ThemeColors = typeof lightTheme;

