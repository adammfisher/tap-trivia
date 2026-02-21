'use strict';

const { TABLE, scan } = require('./dynamo');

/**
 * Global name uniqueness with _N suffix.
 * Scans the Players table for matching names and finds the lowest available number.
 */

/**
 * Find all players whose displayName matches the base name or baseName_N pattern.
 * Case-insensitive. Returns just the matching displayNames (lowercased).
 */
async function findMatchingNames(baseName, excludePlayerId) {
  const lower = baseName.toLowerCase().trim();

  // Scan Players table — only pull back displayName and playerId
  const players = await scan(TABLE.PLAYERS, {
    ProjectionExpression: 'playerId, displayName'
  });

  const matches = new Set();
  for (const p of players) {
    if (p.playerId === excludePlayerId || !p.displayName) continue;
    const pLower = p.displayName.toLowerCase().trim();
    // Exact match or baseName_N pattern
    if (pLower === lower) {
      matches.add(pLower);
    } else if (pLower.startsWith(lower + '_')) {
      const suffix = pLower.slice(lower.length + 1);
      if (/^\d+$/.test(suffix)) {
        matches.add(pLower);
      }
    }
  }
  return matches;
}

/**
 * Check if a name is globally available (case-insensitive).
 * Returns { available, suggestedName }.
 *   - available=true:  name is free, suggestedName === desiredName
 *   - available=false: name is taken, suggestedName = "name_N" (lowest N)
 */
async function findAvailableName(desiredName, excludePlayerId) {
  const lower = desiredName.toLowerCase().trim();
  const matches = await findMatchingNames(desiredName, excludePlayerId);

  // No collision — name is available
  if (!matches.has(lower)) {
    return { available: true, suggestedName: desiredName };
  }

  // Find the lowest available _N
  for (let n = 1; n <= 999; n++) {
    const candidate = `${lower}_${n}`;
    if (!matches.has(candidate)) {
      // Preserve the user's original casing for the base name
      return { available: false, suggestedName: `${desiredName.trim()}_${n}` };
    }
  }

  // Extremely unlikely — 999 variants taken
  return { available: false, suggestedName: `${desiredName.trim()}_${Date.now() % 10000}` };
}

module.exports = {
  findMatchingNames,
  findAvailableName
};
