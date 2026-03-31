'use strict';

/**
 * Display-time name deduplication.
 * No database access — pure function that deduplicates an array of player names.
 * Used by leaderboard, TV state, and between-game endpoints.
 *
 * Names are only deduplicated within the same context (same bar, same game).
 * Players keep whatever name they chose — suffixes are display-only.
 */

/**
 * Deduplicate player names for display within a single context.
 *
 * @param {Array<{playerId: string, playerName: string}>} players
 * @returns {Map<string, string>} playerId -> deduplicated display name
 *
 * Rules:
 * - Case-insensitive collision detection
 * - If only one player has a name, no suffix added
 * - If N players share a name, sort by playerId for stability (same player
 *   always gets the same suffix across polls). First keeps bare name,
 *   subsequent get _2, _3, etc.
 */
function deduplicateNames(players) {
  const result = new Map();
  if (!players || players.length === 0) return result;

  // Group by lowercase name
  const groups = new Map();
  for (const p of players) {
    const name = (p.playerName || 'Anonymous').trim();
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ playerId: p.playerId, originalName: name });
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      // No collision — use name as-is
      result.set(group[0].playerId, group[0].originalName);
    } else {
      // Collision — sort by playerId for deterministic ordering
      group.sort((a, b) => a.playerId.localeCompare(b.playerId));
      // First player keeps bare name, rest get _2, _3, etc.
      result.set(group[0].playerId, group[0].originalName);
      for (let i = 1; i < group.length; i++) {
        result.set(group[i].playerId, `${group[i].originalName}_${i + 1}`);
      }
    }
  }

  return result;
}

module.exports = { deduplicateNames };
