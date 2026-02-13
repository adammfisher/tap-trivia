'use strict';

const { TABLE, get, put, query, docClient, PutCommand, QueryCommand } = require('./shared/dynamo');
const { calculatePoints } = require('./shared/scoring');

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
    const { questionNumber, selectedAnswer, playerName, clientElapsedMs } = body;
    const playerId = event.headers?.['x-player-id'] || event.headers?.['X-Player-ID'];

    // --- Validation ---

    if (!gameId) {
      return response(400, {
        error: 'MISSING_GAME_ID',
        message: 'gameId is required',
        statusCode: 400
      });
    }

    if (!playerId) {
      return response(400, {
        error: 'MISSING_PLAYER_ID',
        message: 'X-Player-ID header is required',
        statusCode: 400
      });
    }

    if (!questionNumber || !selectedAnswer) {
      return response(400, {
        error: 'MISSING_FIELDS',
        message: 'questionNumber and selectedAnswer are required',
        statusCode: 400
      });
    }

    const qNum = parseInt(questionNumber, 10);
    if (isNaN(qNum) || qNum < 1 || qNum > 15) {
      return response(400, {
        error: 'INVALID_QUESTION_NUMBER',
        message: 'questionNumber must be between 1 and 15',
        statusCode: 400
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
        message: 'Game not found',
        statusCode: 404
      });
    }

    const game = games[0];
    const question = game.questions[qNum - 1];

    if (!question) {
      return response(404, {
        error: 'QUESTION_NOT_FOUND',
        message: 'Question not found in game data',
        statusCode: 404
      });
    }

    // --- Timing validation ---

    const questionStartEpoch = game.startTimeEpoch + (qNum - 1) * 60000;
    const serverTimestamp = Date.now();
    const elapsedMs = serverTimestamp - questionStartEpoch;

    if (elapsedMs < 5000) {
      return response(403, {
        error: 'QUESTION_NOT_AVAILABLE',
        message: 'Answers are not being accepted yet for this question',
        statusCode: 403
      });
    }

    if (elapsedMs > 50000) {
      return response(403, {
        error: 'ANSWER_WINDOW_CLOSED',
        message: 'The answer window for this question has closed',
        statusCode: 403
      });
    }

    // --- Check correctness and calculate points ---
    // Use client elapsed time if provided and within 2s of server time,
    // so the points the player sees at tap time match what they receive.
    let scoringElapsedMs = elapsedMs;
    if (typeof clientElapsedMs === 'number' &&
        clientElapsedMs >= 5000 && clientElapsedMs <= 50000 &&
        Math.abs(clientElapsedMs - elapsedMs) <= 2000) {
      scoringElapsedMs = clientElapsedMs;
    }

    const correct = selectedAnswer === question.answer;
    const points = correct ? calculatePoints(scoringElapsedMs) : 0;

    // --- Get player's bar assignment ---

    const player = await get(TABLE.PLAYERS, { PK: `PLAYER#${playerId}` });
    const barCode = player?.currentBarCode || '';

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
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
};
