'use strict';

const { TABLE, get, put, query, update, docClient, PutCommand, QueryCommand } = require('./shared/dynamo');
const { calculatePoints } = require('./shared/scoring');
const { QUESTION_DURATION_MS } = require('./shared/game-clock');

/**
 * Get the ISO date string for the Monday of the current week (ET timezone).
 */
function getMonday() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  et.setDate(et.getDate() - diff);
  return `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    const gameId = event.pathParameters?.gameId;
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { questionNumber, selectedAnswer, playerName } = body;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    // --- Validation ---

    if (!gameId) {
      return response(400, {
        error: 'MISSING_GAME_ID',
        message: 'gameId is required'
      });
    }

    if (!playerId) {
      return response(400, {
        error: 'MISSING_PLAYER_ID',
        message: 'X-Player-ID header is required'
      });
    }

    if (!questionNumber || !selectedAnswer) {
      return response(400, {
        error: 'MISSING_FIELDS',
        message: 'questionNumber and selectedAnswer are required'
      });
    }

    const qNum = parseInt(questionNumber, 10);
    if (isNaN(qNum) || qNum < 1 || qNum > 15) {
      return response(400, {
        error: 'INVALID_QUESTION_NUMBER',
        message: 'questionNumber must be between 1 and 15'
      });
    }

    // --- Look up the game ---

    const games = await query(TABLE.GAMES, {
      IndexName: 'gameId-index',
      KeyConditionExpression: 'gameId = :gid',
      ExpressionAttributeValues: { ':gid': gameId }
    });

    if (!games || games.length === 0) {
      return response(404, {
        error: 'GAME_NOT_FOUND',
        message: 'Game not found'
      });
    }

    const game = games[0];
    const question = game.questions[qNum - 1];

    if (!question) {
      return response(404, {
        error: 'QUESTION_NOT_FOUND',
        message: 'Question not found in game data'
      });
    }

    // --- Timing validation ---

    const questionStartEpoch = game.startTimeEpoch + (qNum - 1) * QUESTION_DURATION_MS;
    const serverTimestamp = Date.now();
    const elapsedMs = serverTimestamp - questionStartEpoch;

    if (elapsedMs < 4000) {
      return response(403, {
        error: 'QUESTION_NOT_AVAILABLE',
        message: 'Answers are not being accepted yet for this question'
      });
    }

    if (elapsedMs > 45000) {
      return response(403, {
        error: 'ANSWER_WINDOW_CLOSED',
        message: 'The answer window for this question has closed'
      });
    }

    // --- Get player record — reject forged/unknown player IDs ---
    const player = await get(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` });
    if (!player) {
      return response(403, {
        error: 'UNREGISTERED_PLAYER',
        message: 'Player not found. Please restart the app.'
      });
    }

    // --- Check correctness and calculate points (server time is authoritative) ---
    const correct = selectedAnswer === question.answer;
    const points = correct ? calculatePoints(elapsedMs) : 0;

    // --- Use bar assignment from player record only ---
    const barCode = player.currentBarCode || '';

    // --- Write the answer (conditional to prevent duplicates) ---

    const answerItem = {
      PK: `ANSWER#${gameId}#${qNum}`,
      SK: `PLAYER#${playerId}`,
      playerId,
      playerName: playerName || player?.displayName || 'Anonymous',
      barCode,
      selectedAnswer,
      isCorrect: correct,
      serverTimestamp,
      elapsedMs,
      pointsAwarded: points,
      questionNumber: qNum,
      gameId,
      gameIdBarCode: `${gameId}#${barCode}`,
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    };

    // Allow answer changes — overwrite previous answer for this question
    await put(TABLE.ANSWERS, answerItem);

    // --- Calculate running total for this player in this game ---

    const playerAnswers = await query(TABLE.ANSWERS, {
      IndexName: 'game-player-index',
      KeyConditionExpression: 'gameId = :gid AND playerId = :pid',
      ExpressionAttributeValues: {
        ':gid': gameId,
        ':pid': playerId
      }
    });

    const totalGameScore = playerAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);

    // --- Update weekly stats (fire-and-forget, don't block response) ---
    if (points > 0) {
      const monday = getMonday();
      // Update player weekly stats (lazy reset if new week)
      const playerWeekly = update(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` },
        'SET weekStart = :ws, weeklyPoints = if_not_exists(weeklyPoints, :zero) + :pts, weeklyGames = if_not_exists(weeklyGames, :zero)',
        { ':ws': monday, ':pts': points, ':zero': 0 }
      ).then(async (playerResult) => {
        // If weekStart changed, reset first then add
        if (playerResult && playerResult.weekStart !== monday) {
          await update(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` },
            'SET weekStart = :ws, weeklyPoints = :pts, weeklyGames = :one',
            { ':ws': monday, ':pts': points, ':one': 1 }
          );
        }
      }).catch(err => console.error('Weekly player update error:', err.message));

      // Update bar weekly aggregate
      const barWeekly = (async () => {
        if (!barCode) return;
        const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });
        if (!bar) return;
        if (bar.weekStart !== monday) {
          // New week — reset bar weekly stats
          await update(TABLE.BARS, { PK: `BAR#${barCode}` },
            'SET weekStart = :ws, weeklyTotalPoints = :pts, weeklyTotalQuestions = :one, scoreIndex = :si',
            { ':ws': monday, ':pts': points, ':one': 1, ':si': points }
          );
        } else {
          const newTotal = (bar.weeklyTotalPoints || 0) + points;
          const newQuestions = (bar.weeklyTotalQuestions || 0) + 1;
          const newIndex = Math.round(newTotal / newQuestions);
          await update(TABLE.BARS, { PK: `BAR#${barCode}` },
            'SET weeklyTotalPoints = :tp, weeklyTotalQuestions = :tq, scoreIndex = :si',
            { ':tp': newTotal, ':tq': newQuestions, ':si': newIndex }
          );
        }
      })().catch(err => console.error('Weekly bar update error:', err.message));

      // Don't await — let these run in background
      Promise.allSettled([playerWeekly, barWeekly]).catch(() => {});
    }

    return response(200, {
      correct,
      pointsAwarded: points,
      correctAnswer: question.answer,
      totalGameScore,
      elapsedMs
    });
  } catch (err) {
    console.error('submit-answer error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
};
