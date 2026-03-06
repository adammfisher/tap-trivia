/** Format seconds into human-readable countdown (e.g., "10h 5m", "3m 22s", "15s") */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/** Format large number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Category string → emoji icon */
export function getCategoryIcon(category: string): string {
  if (!category) return '\u{1F9E0}';
  const c = category.toLowerCase();
  const map: Record<string, string> = {
    science: '\u{1F52C}',
    history: '\u{1F3DB}',
    geography: '\u{1F30D}',
    sports: '\u26BD',
    music: '\u{1F3B5}',
    movies: '\u{1F3AC}',
    television: '\u{1F4FA}',
    tv: '\u{1F4FA}',
    literature: '\u{1F4DA}',
    books: '\u{1F4DA}',
    art: '\u{1F3A8}',
    food: '\u{1F355}',
    animals: '\u{1F43E}',
    nature: '\u{1F333}',
    technology: '\u{1F4BB}',
    math: '\u{1F4D0}',
    politics: '\u{1F3DB}',
    religion: '\u{1F54C}',
    mythology: '\u{1F531}',
    language: '\u{1F4AC}',
    pop: '\u{1F31F}',
    culture: '\u{1F30E}',
    gaming: '\u{1F3AE}',
    space: '\u{1F680}',
    astronomy: '\u{1F52D}',
    health: '\u{1FA7A}',
    business: '\u{1F4BC}',
    economics: '\u{1F4B0}',
    fashion: '\u{1F457}',
    philosophy: '\u{1F914}',
    entertainment: '\u{1F3AD}',
  };
  for (const [key, emoji] of Object.entries(map)) {
    if (c.includes(key)) return emoji;
  }
  return '\u{1F9E0}';
}
