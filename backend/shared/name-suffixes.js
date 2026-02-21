'use strict';

const { TABLE, scan, update } = require('./dynamo');

/**
 * Curated list of fun, creative name suffixes.
 * Mix of bar/drink themed, trivia/game themed, silly superlatives, and fun adjectives.
 * Nothing offensive — all playful and lighthearted.
 */
const SUFFIXES = [
  // Bar & drink themed
  'the Bartender', 'on the Rocks', 'with a Twist', 'Last Call', 'Happy Hour',
  'Top Shelf', 'Neat', 'Double Shot', 'On Tap', 'No Ice',
  'Stirred Not Shaken', 'the Regular', 'Tab Runner', 'the Designated Driver',

  // Trivia & game themed
  'the Brain', 'the Brainiac', 'Quiz Whiz', 'the Professor', 'the Scholar',
  'the Mastermind', 'Big Brain', 'the Oracle', 'the Sage', 'the Riddler',
  'Trivia Titan', 'the Fact Finder', 'Captain Obvious', 'the Wildcard',

  // Silly superlatives
  'the Great', 'the Magnificent', 'the Spectacular', 'the Legendary',
  'the Unstoppable', 'the Incredible', 'the Mighty', 'the Fearless',
  'the Bold', 'Supreme', 'the Majestic', 'the Glorious',

  // Fun qualifiers
  'the Original', 'Deluxe', 'Premium', 'Extra Crispy', 'Turbo',
  'the Remix', 'Reloaded', 'the Sequel', 'After Dark',
  'the Wise', 'the Swift', 'the Lucky', 'the Daring', 'Extraordinaire',
  'MVP', 'the Champ', 'the Legend', 'the Ace', 'the Wizard',
  'the Notorious', 'the Fantastic', 'the One and Only'
];

/**
 * Get all players currently at a specific bar/group.
 * Uses a Scan with FilterExpression (no GSI on currentBarCode).
 * Fine for this scale — the Players table is small.
 */
async function getPlayersAtBar(barCode, excludePlayerId) {
  const result = await scan(TABLE.PLAYERS, {
    FilterExpression: 'currentBarCode = :bc',
    ExpressionAttributeValues: { ':bc': barCode }
  });
  // Exclude the requesting player from the collision check
  return result.filter(p => p.playerId !== excludePlayerId);
}

/**
 * Check if a display name collides with any existing player at the bar.
 * Case-insensitive comparison.
 */
function hasNameCollision(desiredName, playersAtBar) {
  const lower = desiredName.toLowerCase().trim();
  return playersAtBar.some(p =>
    p.displayName && p.displayName.toLowerCase().trim() === lower
  );
}

/**
 * Generate a unique suffixed display name.
 * Shuffles the suffix list and picks the first one that doesn't collide.
 * Returns the original name if no collision, or "Name the Great" etc. if collision found.
 */
function deduplicateDisplayName(desiredName, playersAtBar) {
  if (!hasNameCollision(desiredName, playersAtBar)) {
    return desiredName;
  }

  // Shuffle suffixes for variety
  const shuffled = [...SUFFIXES].sort(() => Math.random() - 0.5);
  const existingNames = new Set(
    playersAtBar
      .filter(p => p.displayName)
      .map(p => p.displayName.toLowerCase().trim())
  );

  for (const suffix of shuffled) {
    const candidate = `${desiredName} ${suffix}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // Extremely unlikely fallback — all 55 suffixes taken by the same base name
  return `${desiredName} #${Math.floor(Math.random() * 999) + 1}`;
}

/**
 * Full dedup flow: check for collision and update the player record if needed.
 * Returns the effective display name (original or suffixed).
 */
async function deduplicateAndUpdate(playerId, desiredName, barCode) {
  const playersAtBar = await getPlayersAtBar(barCode, playerId);
  const effectiveName = deduplicateDisplayName(desiredName, playersAtBar);

  // Update the player's displayName if it was suffixed
  if (effectiveName !== desiredName) {
    await update(
      TABLE.PLAYERS,
      { PK: `PLAYER#${playerId}` },
      'SET displayName = :name, updatedAt = :now',
      {
        ':name': effectiveName,
        ':now': new Date().toISOString()
      }
    );
  }

  return effectiveName;
}

module.exports = {
  SUFFIXES,
  getPlayersAtBar,
  hasNameCollision,
  deduplicateDisplayName,
  deduplicateAndUpdate
};
