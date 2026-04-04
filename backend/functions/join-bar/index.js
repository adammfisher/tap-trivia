'use strict';

const { TABLE, get, update, scan, docClient, UpdateCommand } = require('./shared/dynamo');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { barCode } = body;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    if (!barCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_BAR_CODE', message: 'barCode is required' })
      };
    }

    if (!playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_PLAYER_ID', message: 'X-Player-ID header is required' })
      };
    }

    // Validate bar exists and is active
    const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });

    if (!bar || bar.status !== 'active') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'INVALID_BAR_CODE',
          message: "That code doesn't match any active location or group. Double-check and try again."
        })
      };
    }

    // Check if the player already has a bar assignment
    const player = await get(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` });

    if (player && player.currentBarCode && player.currentBarCode !== barCode) {
      // Decrement activePlayers on the old bar (don't go below 0)
      try {
        await docClient.send(new UpdateCommand({
          TableName: TABLE.BARS,
          Key: { PK: `BAR#${player.currentBarCode}` },
          UpdateExpression: 'SET activePlayers = activePlayers - :one',
          ConditionExpression: 'activePlayers > :zero',
          ExpressionAttributeValues: {
            ':one': 1,
            ':zero': 0
          }
        }));
      } catch (err) {
        // If the condition fails (already 0) or bar no longer exists, that's fine
        if (err.name !== 'ConditionalCheckFailedException') {
          console.warn('Failed to decrement old bar activePlayers:', err.message);
        }
      }
    }

    // Update player's currentBarCode (create if not exists)
    await update(
      TABLE.PLAYERS,
      { PK: `PLAYER#${playerId}` },
      'SET currentBarCode = :barCode, updatedAt = :now',
      {
        ':barCode': barCode,
        ':now': new Date().toISOString()
      }
    );

    // Increment activePlayers on the new bar (skip if already at this bar)
    let updatedBar;
    if (!player || player.currentBarCode !== barCode) {
      updatedBar = await update(
        TABLE.BARS,
        { PK: `BAR#${barCode}` },
        'SET activePlayers = activePlayers + :one',
        { ':one': 1 }
      );
    } else {
      // Player already at this bar — no increment needed
      updatedBar = bar;
    }

    // Return the player's current displayName
    const updatedPlayer = await get(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` });
    const playerName = updatedPlayer?.displayName || null;

    // Check for name collision at this bar — only against recently active players (last 30 min)
    let nameCollision = false;
    if (playerName) {
      const nameLower = playerName.toLowerCase().trim();
      const recentCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const barPlayers = await scan(TABLE.PLAYERS, {
        FilterExpression: 'currentBarCode = :bc AND PK <> :pk AND updatedAt > :cutoff',
        ExpressionAttributeValues: {
          ':bc': barCode,
          ':pk': `PLAYER#${playerId}`,
          ':cutoff': recentCutoff
        },
        ProjectionExpression: 'displayName'
      });
      nameCollision = barPlayers.some(p =>
        p.displayName && p.displayName.toLowerCase().trim() === nameLower
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        barCode: bar.barCode,
        barName: bar.barName,
        activePlayers: updatedBar.activePlayers,
        type: bar.type || 'bar',
        displayName: playerName,
        nameCollision
      })
    };
  } catch (err) {
    console.error('join-bar error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
