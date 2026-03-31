'use strict';

const { TABLE, get, put, update } = require('./shared/dynamo');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

/**
 * Validate displayName: 2-20 characters, alphanumeric, spaces, and underscores.
 */
function isValidDisplayName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  return /^[a-zA-Z0-9 _]+$/.test(trimmed);
}

/**
 * GET /player/{playerId}  — Fetch player profile
 * PUT /player/{playerId}  — Create or update player profile
 *
 * Names are stored as-is (no global dedup). Deduplication happens at display
 * time in the leaderboard/TV endpoints, scoped to the current bar + game.
 */
exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method;
    const playerId = event.pathParameters?.playerId;

    if (!playerId) {
      return response(400, {
        error: 'MISSING_PLAYER_ID',
        message: 'playerId is required'
      });
    }

    const playerKey = { PK: `PLAYER#${playerId}` };

    // ---- GET /player/{playerId} ----
    if (method === 'GET') {
      const player = await get(TABLE.PLAYERS, playerKey);

      if (!player) {
        return response(404, {
          error: 'PLAYER_NOT_FOUND',
          message: 'Player not found'
        });
      }

      return response(200, {
        playerId: player.playerId,
        displayName: player.displayName,
        currentBarCode: player.currentBarCode || null,
        gamesPlayed: player.gamesPlayed || 0,
        totalPoints: player.totalPoints || 0,
        createdAt: player.createdAt,
        lastPlayedAt: player.lastPlayedAt || null,
        trialStartedAt: player.trialStartedAt || null
      });
    }

    // ---- PUT /player/{playerId} ----
    if (method === 'PUT') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      const { displayName, currentBarCode, trialStartedAt } = body;

      // Validate displayName if provided
      if (displayName !== undefined && !isValidDisplayName(displayName)) {
        return response(400, {
          error: 'INVALID_DISPLAY_NAME',
          message: 'displayName must be 2-20 characters, alphanumeric, spaces, and underscores only'
        });
      }

      // Validate trialStartedAt if provided
      if (trialStartedAt !== undefined && (typeof trialStartedAt !== 'number' || !Number.isFinite(trialStartedAt) || trialStartedAt <= 0)) {
        return response(400, {
          error: 'INVALID_TRIAL_START',
          message: 'trialStartedAt must be a positive epoch millisecond timestamp'
        });
      }

      // Check if player already exists
      const existing = await get(TABLE.PLAYERS, playerKey);

      if (!existing) {
        // Create new player — name stored as-is
        if (!displayName) {
          return response(400, {
            error: 'MISSING_DISPLAY_NAME',
            message: 'displayName is required when creating a new player'
          });
        }

        const now = new Date().toISOString();
        const newPlayer = {
          PK: `PLAYER#${playerId}`,
          playerId,
          displayName: displayName.trim(),
          currentBarCode: currentBarCode || null,
          gamesPlayed: 0,
          totalPoints: 0,
          createdAt: now,
          lastPlayedAt: null,
          ...(trialStartedAt !== undefined && { trialStartedAt })
        };

        await put(TABLE.PLAYERS, newPlayer);

        return response(201, {
          playerId: newPlayer.playerId,
          displayName: newPlayer.displayName,
          currentBarCode: newPlayer.currentBarCode,
          gamesPlayed: newPlayer.gamesPlayed,
          totalPoints: newPlayer.totalPoints,
          createdAt: newPlayer.createdAt,
          lastPlayedAt: newPlayer.lastPlayedAt,
          trialStartedAt: newPlayer.trialStartedAt || null
        });
      }

      // Update existing player — only update provided fields
      const expressionParts = [];
      const expressionValues = {};
      const expressionNames = {};

      if (displayName !== undefined) {
        expressionParts.push('#displayName = :displayName');
        expressionValues[':displayName'] = displayName.trim();
        expressionNames['#displayName'] = 'displayName';
      }

      if (currentBarCode !== undefined) {
        expressionParts.push('#currentBarCode = :currentBarCode');
        expressionValues[':currentBarCode'] = currentBarCode;
        expressionNames['#currentBarCode'] = 'currentBarCode';
      }

      // trialStartedAt is write-once: if_not_exists ensures the original value is never overwritten
      if (trialStartedAt !== undefined) {
        expressionParts.push('trialStartedAt = if_not_exists(trialStartedAt, :trialStartedAt)');
        expressionValues[':trialStartedAt'] = trialStartedAt;
      }

      if (expressionParts.length === 0) {
        return response(400, {
          error: 'NO_FIELDS',
          message: 'At least one field (displayName, currentBarCode, trialStartedAt) must be provided'
        });
      }

      // Always update the updatedAt timestamp
      expressionParts.push('#updatedAt = :updatedAt');
      expressionValues[':updatedAt'] = new Date().toISOString();
      expressionNames['#updatedAt'] = 'updatedAt';

      const updateExpression = 'SET ' + expressionParts.join(', ');

      const updated = await update(
        TABLE.PLAYERS,
        playerKey,
        updateExpression,
        expressionValues,
        expressionNames
      );

      return response(200, {
        playerId: updated.playerId,
        displayName: updated.displayName,
        currentBarCode: updated.currentBarCode || null,
        gamesPlayed: updated.gamesPlayed || 0,
        totalPoints: updated.totalPoints || 0,
        createdAt: updated.createdAt,
        lastPlayedAt: updated.lastPlayedAt || null,
        trialStartedAt: updated.trialStartedAt || null
      });
    }

    // Unsupported method
    return response(405, {
      error: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} not allowed`
    });
  } catch (err) {
    console.error('get-player error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
};
