'use strict';

const { TABLE, query } = require('./shared/dynamo');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

// --- Deterministic shuffle utilities ---

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Shuffle answers deterministically using gameId + questionNumber as seed.
 * Returns { shuffledAnswers, correctIndex, eliminateOrder } where
 * eliminateOrder maps the original wrongAnswers eliminateOrder indices
 * to their positions in the shuffled array.
 */
function shuffleAnswers(gameId, questionNumber, correctAnswer, wrongAnswers, originalEliminateOrder) {
  // Build the answers array: correct first, then wrong
  const answers = [
    { text: correctAnswer, originalType: 'correct', originalWrongIdx: -1 },
    ...wrongAnswers.map((wa, idx) => ({ text: wa, originalType: 'wrong', originalWrongIdx: idx }))
  ];

  // Fisher-Yates shuffle with seeded PRNG
  const seed = seedFromString(`${gameId}${questionNumber}`);
  const rng = seededRandom(seed);

  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }

  // Extract shuffled answer texts
  const shuffledAnswers = answers.map(a => a.text);

  // Find the correct answer index in the shuffled array
  const correctIndex = answers.findIndex(a => a.originalType === 'correct');

  // Map originalEliminateOrder (indices into wrongAnswers) to shuffled indices
  const eliminateOrder = (originalEliminateOrder || []).map(origWrongIdx => {
    return answers.findIndex(a => a.originalWrongIdx === origWrongIdx);
  });

  return { shuffledAnswers, correctIndex, eliminateOrder };
}

exports.handler = async (event) => {
  try {
    const gameId = event.pathParameters?.gameId;
    const questionNumberStr = event.pathParameters?.questionNumber;

    if (!gameId || !questionNumberStr) {
      return response(400, {
        error: 'MISSING_PARAMETERS',
        message: 'gameId and questionNumber are required',
        statusCode: 400
      });
    }

    const questionNumber = parseInt(questionNumberStr, 10);
    if (isNaN(questionNumber) || questionNumber < 1 || questionNumber > 15) {
      return response(400, {
        error: 'INVALID_QUESTION_NUMBER',
        message: 'questionNumber must be between 1 and 15',
        statusCode: 400
      });
    }

    // Look up the game via the gameId-index GSI
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

    // Calculate when this question becomes available
    const questionStartEpoch = game.startTimeEpoch + (questionNumber - 1) * 60000;
    const now = Date.now();

    if (now < questionStartEpoch) {
      return response(403, {
        error: 'QUESTION_NOT_AVAILABLE',
        message: 'This question is not available yet',
        statusCode: 403,
        questionStartEpoch,
        secondsUntilAvailable: Math.ceil((questionStartEpoch - now) / 1000)
      });
    }

    // Get the question from the game's embedded questions array
    const q = game.questions[questionNumber - 1];
    if (!q) {
      return response(404, {
        error: 'QUESTION_NOT_FOUND',
        message: 'Question not found in game data',
        statusCode: 404
      });
    }

    // Shuffle answers deterministically
    const { shuffledAnswers, correctIndex, eliminateOrder } = shuffleAnswers(
      gameId,
      questionNumber,
      q.answer,
      q.wrongAnswers || [],
      q.eliminateOrder || []
    );

    return response(200, {
      questionNumber,
      question: q.question,
      category: q.category,
      subcategory: q.subcategory || '',
      difficulty: q.difficulty,
      answers: shuffledAnswers,
      eliminateOrder,
      questionStartEpoch,
      questionEndEpoch: questionStartEpoch + 50000
    });
  } catch (err) {
    console.error('get-question error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
};

// Export shuffle utilities for use by get-tv-state
exports.shuffleAnswers = shuffleAnswers;
exports.seedFromString = seedFromString;
exports.seededRandom = seededRandom;
