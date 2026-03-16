/**
 * Typography for tvOS — TV-scaled font sizes (1920x1080).
 * Font family names match the PostScript names from bundled .ttf files.
 */

export const fonts = {
  fredoka: {
    regular: 'Fredoka-Regular',
    medium: 'Fredoka-Medium',
    semiBold: 'Fredoka-SemiBold',
    bold: 'Fredoka-Bold',
  },
  outfit: {
    light: 'Outfit-Light',
    regular: 'Outfit-Regular',
    medium: 'Outfit-Medium',
    semiBold: 'Outfit-SemiBold',
    bold: 'Outfit-Bold',
    extraBold: 'Outfit-ExtraBold',
    black: 'Outfit-Black',
  },
  dmMono: {
    regular: 'DMMono-Regular',
    medium: 'DMMono-Medium',
  },
} as const;

/** TV-scaled font sizes (all at 2x of the 960x540 prototype) */
export const tvFontSizes = {
  // Display / headings
  hero: 80,        // Game title, big countdown
  h1: 60,          // Question text
  h2: 48,          // Section headers
  h3: 40,          // Category name
  h4: 36,          // Subheading

  // Body
  body: 32,        // Default body text
  bodyLg: 36,      // Larger body
  bodySm: 28,      // Smaller body

  // UI elements
  badge: 24,       // Badge labels
  caption: 22,     // Captions, fine print
  timer: 72,       // Timer number
  score: 56,       // Score display
  points: 44,      // Points available
  rank: 48,        // Rank number

  // Answer cards
  answerLetter: 32, // A/B/C/D letter
  answerText: 40,   // Answer text

  // Leaderboard
  leaderName: 32,
  leaderScore: 32,

  // Signage
  signageTitle: 48,
  signageBody: 36,
  signageItem: 32,
  signagePrice: 36,
} as const;
