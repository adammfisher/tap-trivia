/**
 * Avatar utilities — hue from name hash, medal emojis for top 3.
 */

export function getAvatarHue(name: string): number {
  return name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
}

export function getAvatarColors(name: string): { start: string; end: string } {
  const hue = getAvatarHue(name);
  return {
    start: `hsl(${hue}, 65%, 52%)`,
    end: `hsl(${(hue + 35) % 360}, 65%, 42%)`,
  };
}

export function getRankMedal(rank: number): string | null {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return null;
}

export function getCategoryEmoji(category: string): string {
  const lower = (category || '').toLowerCase();
  const map: Record<string, string> = {
    entertainment: '\u{1F3AC}',
    science: '\u{1F52C}',
    history: '\u{1F4DC}',
    geography: '\u{1F30D}',
    sports: '\u26BD',
    music: '\u{1F3B5}',
    art: '\u{1F3A8}',
    literature: '\u{1F4DA}',
    technology: '\u{1F4BB}',
    food: '\u{1F355}',
    animals: '\u{1F43E}',
    nature: '\u{1F33F}',
    politics: '\u{1F3DB}\uFE0F',
    government: '\u{1F3DB}\uFE0F',
    math: '\u{1F522}',
    language: '\u{1F4DD}',
    'pop culture': '\u{1F31F}',
    movies: '\u{1F3A5}',
    television: '\u{1F4FA}',
    gaming: '\u{1F3AE}',
    space: '\u{1F680}',
  };
  for (const [key, emoji] of Object.entries(map)) {
    if (lower.includes(key)) return emoji;
  }
  return '\u{1F9E0}';
}

export function getDifficultyLabel(difficulty: 1 | 2 | 3): string {
  if (difficulty === 1) return 'Easy';
  if (difficulty === 2) return 'Medium';
  return 'Hard';
}
