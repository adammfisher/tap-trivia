export const colors = {
  green: '#00d4aa',
  red: '#ff4757',
  gold: '#ffd200',
  blue: '#667eea',
  purple: '#764ba2',
  darkGold: '#f7971e',
} as const;

export const gradients = {
  main: ['#0f0326', '#1e0f4a', '#3d1866', '#6b2358', '#a8334a'] as const,
  gold: ['#f7971e', '#ffd200', '#ffe066'] as const,
  correct: ['#00c9a7', '#2ee6b6'] as const,
  wrong: ['#ff4757', '#ff6b81'] as const,
  selected: ['#667eea', '#764ba2'] as const,
  dark: ['#06060f', '#0e0a24', '#1a0f3a'] as const,
  glass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)'] as const,
} as const;

/** rgba(255,255,255,opacity) */
export function w(opacity: number): string {
  return `rgba(255,255,255,${opacity})`;
}

/** rgba(0,0,0,opacity) */
export function b(opacity: number): string {
  return `rgba(0,0,0,${opacity})`;
}

export function getPointsColor(points: number, maxPoints: number = 1000): string {
  const pct = points / maxPoints;
  if (pct > 0.6) return colors.green;
  if (pct > 0.3) return colors.gold;
  return colors.red;
}

export function getTimerColor(secondsRemaining: number, totalSeconds: number): string {
  const pct = secondsRemaining / totalSeconds;
  if (pct > 0.5) return colors.green;
  if (pct > 0.2) return colors.gold;
  return colors.red;
}

/** Badge colors for answer letters A/B/C/D */
export const badgeColors = ['#667eea', '#f7971e', '#00d4aa', '#764ba2'] as const;
