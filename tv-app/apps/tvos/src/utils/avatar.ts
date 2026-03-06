/** Deterministic hue from player name (consistent across screens) */
export function nameHue(name: string): number {
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return sum % 360;
}

/** First letter of name, uppercased */
export function initials(name: string): string {
  return (name.charAt(0) || '?').toUpperCase();
}

/** HSL gradient pair for avatar background */
export function avatarGradient(name: string): [string, string] {
  const hue = nameHue(name);
  return [`hsl(${hue}, 70%, 45%)`, `hsl(${(hue + 30) % 360}, 70%, 55%)`];
}
