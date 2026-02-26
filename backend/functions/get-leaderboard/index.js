'use strict';

const { TABLE, get, query } = require('./shared/dynamo');
const { GAME_DURATION_MS } = require('./shared/game-clock');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

/**
 * Aggregate answer records by playerId, summing pointsAwarded.
 * Returns sorted array (descending by score) with rank numbers.
 */
function aggregateScores(answers) {
  const playerMap = {};

  for (const a of answers) {
    if (!playerMap[a.playerId]) {
      playerMap[a.playerId] = {
        playerId: a.playerId,
        playerName: a.playerName || 'Anonymous',
        barCode: a.barCode || '',
        score: 0,
        questionNumbers: new Set()
      };
    }
    playerMap[a.playerId].score += a.pointsAwarded || 0;
    playerMap[a.playerId].questionNumbers.add(a.questionNumber);
    // Keep the latest playerName in case it changed
    if (a.playerName) {
      playerMap[a.playerId].playerName = a.playerName;
    }
  }

  const sorted = Object.values(playerMap)
    .sort((a, b) => b.score - a.score);

  // Assign ranks (handle ties with same rank)
  let rank = 0;
  let prevScore = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].score !== prevScore) {
      rank = i + 1;
      prevScore = sorted[i].score;
    }
    sorted[i].rank = rank;
  }

  return sorted;
}

exports.handler = async (event) => {
  try {
    const gameId = event.pathParameters?.gameId;
    const type = event.queryStringParameters?.type || 'bar';
    const barCode = event.queryStringParameters?.barCode;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    if (!gameId) {
      return response(400, {
        error: 'MISSING_GAME_ID',
        message: 'gameId is required',
        statusCode: 400
      });
    }

    // ----- BAR LEADERBOARD -----
    if (type === 'bar') {
      if (!barCode) {
        return response(400, {
          error: 'MISSING_BAR_CODE',
          message: 'barCode is required for bar leaderboard',
          statusCode: 400
        });
      }

      // Query all answers for this game + bar combination
      const answers = await query(TABLE.ANSWERS, {
        IndexName: 'game-bar-index',
        KeyConditionExpression: 'gameIdBarCode = :gbk',
        ExpressionAttributeValues: { ':gbk': `${gameId}#${barCode}` }
      });

      const leaderboard = aggregateScores(answers);

      // Get bar info for barName
      const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });
      const barName = bar?.barName || barCode;

      // Find the requesting player's entry
      const playerEntry = playerId
        ? leaderboard.find(e => e.playerId === playerId)
        : null;

      // Count distinct questions answered across all players
      const allQuestionNumbers = new Set();
      for (const a of answers) {
        allQuestionNumbers.add(a.questionNumber);
      }

      return response(200, {
        type: 'bar',
        barCode,
        barName,
        leaders: leaderboard.slice(0, 20).map(e => ({
          rank: e.rank,
          playerId: e.playerId,
          playerName: e.playerName,
          score: e.score
        })),
        you: playerEntry ? {
          rank: playerEntry.rank,
          playerId: playerEntry.playerId,
          playerName: playerEntry.playerName,
          score: playerEntry.score
        } : null,
        totalPlayers: leaderboard.length,
        questionsCompleted: allQuestionNumbers.size
      });
    }

    // ----- GLOBAL LEADERBOARD -----
    if (type === 'global') {
      // Look up the game to check if it's complete
      const games = await query(TABLE.GAMES, {
        IndexName: 'gameId-index',
        KeyConditionExpression: 'gameId = :gid',
        ExpressionAttributeValues: { ':gid': gameId }
      });

      if (!games || games.length === 0) {
        return response(404, {
          error: 'GAME_NOT_FOUND',
          message: 'Game not found',
          statusCode: 404
        });
      }

      const game = games[0];
      const gameEndEpoch = game.startTimeEpoch + GAME_DURATION_MS;

      if (Date.now() < gameEndEpoch) {
        return response(403, {
          error: 'GLOBAL_LEADERBOARD_NOT_READY',
          message: 'The global leaderboard is available after the game ends',
          statusCode: 403,
          availableAtEpoch: gameEndEpoch,
          secondsUntilAvailable: Math.ceil((gameEndEpoch - Date.now()) / 1000)
        });
      }

      // Query ALL answers for this game using game-player-index
      const allAnswers = await query(TABLE.ANSWERS, {
        IndexName: 'game-player-index',
        KeyConditionExpression: 'gameId = :gid',
        ExpressionAttributeValues: { ':gid': gameId }
      });

      const leaderboard = aggregateScores(allAnswers);

      // For top 20, look up bar names
      const top20 = leaderboard.slice(0, 20);
      const barCodeSet = new Set(top20.map(e => e.barCode).filter(Boolean));
      const barNameMap = {};

      for (const bc of barCodeSet) {
        const bar = await get(TABLE.BARS, { PK: `BAR#${bc}` });
        barNameMap[bc] = bar?.barName || bc;
      }

      // Find the requesting player's entry
      const playerEntry = playerId
        ? leaderboard.find(e => e.playerId === playerId)
        : null;

      return response(200, {
        type: 'global',
        leaders: top20.map(e => ({
          rank: e.rank,
          playerId: e.playerId,
          playerName: e.playerName,
          score: e.score,
          barName: barNameMap[e.barCode] || ''
        })),
        you: playerEntry ? {
          rank: playerEntry.rank,
          playerId: playerEntry.playerId,
          playerName: playerEntry.playerName,
          score: playerEntry.score,
          barName: barNameMap[playerEntry.barCode] || ''
        } : null,
        totalPlayers: leaderboard.length
      });
    }

    return response(400, {
      error: 'INVALID_TYPE',
      message: 'type must be "bar" or "global"',
      statusCode: 400
    });
  } catch (err) {
    console.error('get-leaderboard error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
};
