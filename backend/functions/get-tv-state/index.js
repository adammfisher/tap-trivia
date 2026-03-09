'use strict';

const { TABLE, get, query, update } = require('./shared/dynamo');
const { getGameState, getNextGameTime, gameTimeslotPK, GAME_DURATION_MS, RESULTS_DURATION_MS } = require('./shared/game-clock');
const { calculatePoints } = require('./shared/scoring');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

// --- Deterministic shuffle utilities (same as get-question) ---

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

function shuffleAnswers(gameId, questionNumber, correctAnswer, wrongAnswers, originalEliminateOrder) {
  const answers = [
    { text: correctAnswer, originalType: 'correct', originalWrongIdx: -1 },
    ...wrongAnswers.map((wa, idx) => ({ text: wa, originalType: 'wrong', originalWrongIdx: idx }))
  ];

  const seed = seedFromString(`${gameId}${questionNumber}`);
  const rng = seededRandom(seed);

  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }

  const shuffledAnswers = answers.map(a => a.text);
  const correctIndex = answers.findIndex(a => a.originalType === 'correct');

  const eliminateOrder = (originalEliminateOrder || []).map(origWrongIdx => {
    return answers.findIndex(a => a.originalWrongIdx === origWrongIdx);
  });

  return { shuffledAnswers, correctIndex, eliminateOrder };
}

/**
 * Aggregate answer records by playerId for a bar leaderboard.
 */
function aggregateBarScores(answers) {
  const playerMap = {};

  for (const a of answers) {
    if (!playerMap[a.playerId]) {
      playerMap[a.playerId] = {
        playerId: a.playerId,
        playerName: a.playerName || 'Anonymous',
        score: 0
      };
    }
    playerMap[a.playerId].score += a.pointsAwarded || 0;
    if (a.playerName) {
      playerMap[a.playerId].playerName = a.playerName;
    }
  }

  const sorted = Object.values(playerMap)
    .sort((a, b) => b.score - a.score);

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

/**
 * Build a bar leaderboard for a given game + barCode.
 * If excludeQuestion is set, answers for that question number are excluded
 * so scores don't update in real time while the question is active.
 */
async function getBarLeaderboard(gameId, barCode, limit, excludeQuestion) {
  const answers = await query(TABLE.ANSWERS, {
    IndexName: 'game-bar-index',
    KeyConditionExpression: 'gameIdBarCode = :gbk',
    ExpressionAttributeValues: { ':gbk': `${gameId}#${barCode}` }
  });

  const filtered = excludeQuestion
    ? answers.filter(a => a.questionNumber !== excludeQuestion)
    : answers;

  const leaderboard = aggregateBarScores(filtered);
  return leaderboard.slice(0, limit || 10).map(e => ({
    rank: e.rank,
    playerName: e.playerName,
    score: e.score
  }));
}

/**
 * Build a global leaderboard for a completed game.
 */
async function getGlobalLeaderboard(gameId, limit) {
  const allAnswers = await query(TABLE.ANSWERS, {
    IndexName: 'game-player-index',
    KeyConditionExpression: 'gameId = :gid',
    ExpressionAttributeValues: { ':gid': gameId }
  });

  const playerMap = {};
  for (const a of allAnswers) {
    if (!playerMap[a.playerId]) {
      playerMap[a.playerId] = {
        playerId: a.playerId,
        playerName: a.playerName || 'Anonymous',
        barCode: a.barCode || '',
        score: 0
      };
    }
    playerMap[a.playerId].score += a.pointsAwarded || 0;
    if (a.playerName) playerMap[a.playerId].playerName = a.playerName;
  }

  const sorted = Object.values(playerMap).sort((a, b) => b.score - a.score);

  let rank = 0;
  let prevScore = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].score !== prevScore) {
      rank = i + 1;
      prevScore = sorted[i].score;
    }
    sorted[i].rank = rank;
  }

  // Look up bar names for the top entries
  const topEntries = sorted.slice(0, limit || 10);
  const barCodeSet = new Set(topEntries.map(e => e.barCode).filter(Boolean));
  const barNameMap = {};

  for (const bc of barCodeSet) {
    const bar = await get(TABLE.BARS, { PK: `BAR#${bc}` });
    barNameMap[bc] = bar?.barName || bc;
  }

  return topEntries.map(e => ({
    rank: e.rank,
    playerName: e.playerName,
    score: e.score,
    barName: barNameMap[e.barCode] || ''
  }));
}

exports.handler = async (event) => {
  try {
    const barCode = event.queryStringParameters?.barCode;

    if (!barCode) {
      return response(400, {
        error: 'MISSING_BAR_CODE',
        message: 'barCode query parameter is required',
        statusCode: 400
      });
    }

    // --- Fetch bar info + throttled heartbeat (every 30s max) ---

    let bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });

    // Only write heartbeat if 30+ seconds since last poll (saves DynamoDB writes)
    const HEARTBEAT_INTERVAL_MS = 30000;
    const lastPoll = bar && bar.lastPollAt ? new Date(bar.lastPollAt).getTime() : 0;
    if (bar && (Date.now() - lastPoll >= HEARTBEAT_INTERVAL_MS)) {
      try {
        bar = await update(
          TABLE.BARS,
          { PK: `BAR#${barCode}` },
          'SET lastPollAt = :now',
          { ':now': new Date().toISOString() }
        );
      } catch (err) {
        console.warn('Bar heartbeat update failed:', err.message);
      }
    }

    if (!bar || bar.status !== 'active') {
      return response(404, {
        error: 'BAR_NOT_FOUND',
        message: 'Bar not found or inactive',
        statusCode: 404
      });
    }

    const barName = bar.barName;
    // NOTE: bar.activePlayers is a stale counter (increments on join, rarely decrements).
    // Real-time player count is derived from barLeaderboard length during active games.

    // --- Determine current/next game ---

    const now = Date.now();

    // --- Ad-hoc test game override ---
    let game = null;
    let isAdhocResultsWindow = false;
    const adhocGame = await get(TABLE.GAMES, { PK: 'ADHOC_GAME' });
    if (adhocGame) {
      const adhocState = getGameState(adhocGame.startTimeEpoch, now);
      if (adhocState.gamePhase === 'active' || adhocState.gamePhase === 'pre_game') {
        game = adhocGame;
      } else if (adhocState.gamePhase === 'post_game') {
        // Check if we're still within the results window (30s after game end)
        const gameEndEpoch = adhocGame.startTimeEpoch + GAME_DURATION_MS;
        if (now - gameEndEpoch < RESULTS_DURATION_MS) {
          game = adhocGame;
          isAdhocResultsWindow = true;
        }
      }
    }

    let gameStartEpoch;
    if (!game) {
      gameStartEpoch = getNextGameTime(now);
      const pk = gameTimeslotPK(gameStartEpoch);
      game = await get(TABLE.GAMES, { PK: pk });
    } else {
      gameStartEpoch = game.startTimeEpoch;
    }

    // --- No game found or pre-game state ---

    if (!game) {
      return response(200, {
        state: 'break',
        barCode,
        barName,
        activePlayers: 0,
        nextGameStartEpoch: gameStartEpoch,
        secondsUntilNextGame: Math.ceil((gameStartEpoch - now) / 1000),
        showBarCode: true,
        playerAppUrl: process.env.PLAYER_APP_URL || 'https://localhost:3000',
        lastGameBarLeaderboard: [],
        lastGameGlobalLeaderboard: [],
        signage: bar.signage || null,
        logoUrl: bar.logoUrl || null,
        logoHash: bar.logoHash || null
      });
    }

    const gameState = getGameState(game.startTimeEpoch, now);

    // --- PRE-GAME: game exists but hasn't started yet ---
    // Check if the PREVIOUS game ended within the results window (30s).
    // If so, show the results/winner screen instead of the lobby.

    if (gameState.gamePhase === 'pre_game') {
      // Look back one 15-min slot for the previous game
      const SLOT_MS = 15 * 60 * 1000;
      const prevSlotEpoch = game.startTimeEpoch - SLOT_MS;
      const prevGameEndEpoch = prevSlotEpoch + GAME_DURATION_MS;

      if (now - prevGameEndEpoch >= 0 && now - prevGameEndEpoch < RESULTS_DURATION_MS) {
        // Within results window — fetch previous game and show game_over
        const prevPK = gameTimeslotPK(prevSlotEpoch);
        const prevGame = await get(TABLE.GAMES, { PK: prevPK });

        if (prevGame) {
          const barLeaderboard = await getBarLeaderboard(prevGame.gameId, barCode, 10);
          const globalLeaderboard = await getGlobalLeaderboard(prevGame.gameId, 10);

          return response(200, {
            state: 'game_over',
            barCode,
            barName,
            activePlayers: barLeaderboard.length,
            gameId: prevGame.gameId,
            totalQuestions: 15,
            barLeaderboard,
            globalLeaderboard,
            nextGameStartEpoch: game.startTimeEpoch,
            secondsUntilNextGame: gameState.secondsUntilStart,
            showBarCode: true,
            playerAppUrl: process.env.PLAYER_APP_URL || 'https://localhost:3000',
            signage: bar.signage || null,
            logoUrl: bar.logoUrl || null,
            logoHash: bar.logoHash || null
          });
        }
      }

      return response(200, {
        state: 'break',
        barCode,
        barName,
        activePlayers: 0,
        nextGameStartEpoch: game.startTimeEpoch,
        secondsUntilNextGame: gameState.secondsUntilStart,
        showBarCode: true,
        playerAppUrl: process.env.PLAYER_APP_URL || 'https://localhost:3000',
        lastGameBarLeaderboard: [],
        lastGameGlobalLeaderboard: [],
        signage: bar.signage || null,
        logoUrl: bar.logoUrl || null,
        logoHash: bar.logoHash || null
      });
    }

    // --- POST-GAME: game is over ---

    if (gameState.gamePhase === 'post_game') {
      const barLeaderboard = await getBarLeaderboard(game.gameId, barCode, 10);
      const globalLeaderboard = await getGlobalLeaderboard(game.gameId, 10);

      // Check if there's a next game coming
      const nextGameStart = getNextGameTime(now);
      const secondsUntilNextGame = Math.ceil((nextGameStart - now) / 1000);

      return response(200, {
        state: 'game_over',
        barCode,
        barName,
        activePlayers: barLeaderboard.length,
        gameId: game.gameId,
        totalQuestions: 15,
        barLeaderboard,
        globalLeaderboard,
        nextGameStartEpoch: nextGameStart,
        secondsUntilNextGame: secondsUntilNextGame > 0 ? secondsUntilNextGame : null,
        showBarCode: true,
        playerAppUrl: process.env.PLAYER_APP_URL || 'https://localhost:3000',
        signage: bar.signage || null,
        logoUrl: bar.logoUrl || null,
        logoHash: bar.logoHash || null
      });
    }

    // --- ACTIVE GAME ---

    const questionNumber = gameState.questionNumber;
    const currentQ = game.questions[questionNumber - 1];

    if (!currentQ) {
      return response(200, {
        state: 'active_game',
        barCode,
        barName,
        activePlayers: 0,
        gameId: game.gameId,
        questionNumber,
        totalQuestions: 15,
        phase: gameState.questionPhase,
        question: null,
        category: null,
        difficulty: null,
        answers: [],
        eliminated: [],
        correctAnswer: null,
        currentPointsAvailable: 0,
        elapsedSeconds: Math.floor(gameState.elapsedInQuestion / 1000),
        barLeaderboard: []
      });
    }

    // Build shuffled answers (same deterministic shuffle as get-question)
    const { shuffledAnswers, correctIndex, eliminateOrder } = shuffleAnswers(
      game.gameId,
      questionNumber,
      currentQ.answer,
      currentQ.wrongAnswers || [],
      currentQ.eliminateOrder || []
    );

    // Build eliminated array based on hints visible (spec format: {index, answer, display})
    const eliminated = [];
    if (gameState.hintsVisible && gameState.hintsVisible.length > 0) {
      for (let i = 0; i < gameState.hintsVisible.length; i++) {
        const idx = eliminateOrder[i];
        if (idx !== undefined && shuffledAnswers[idx]) {
          eliminated.push({
            index: idx,
            answer: shuffledAnswers[idx],
            display: `NOT ${shuffledAnswers[idx]}`
          });
        }
      }
    }

    // Reveal correct answer during reveal AND scores phases
    const isRevealOrScores = gameState.questionPhase === 'reveal' || gameState.questionPhase === 'scores';
    const correctAnswer = isRevealOrScores ? currentQ.answer : null;

    // Calculate current points available
    const currentPointsAvailable = gameState.canAnswer
      ? calculatePoints(gameState.elapsedInQuestion)
      : 0;

    // During playing phases, exclude the current question's answers so
    // scores stay frozen and don't reveal who answered correctly.
    const barLeaderboard = await getBarLeaderboard(
      game.gameId, barCode, 10,
      isRevealOrScores ? null : questionNumber
    );

    // During reveal/scores, compute answer distribution percentages
    let answerPercentages = null;
    let pctCorrect = null;
    let avgAnswerTimeSec = null;
    if (isRevealOrScores) {
      try {
        const qAnswers = await query(TABLE.ANSWERS, {
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': `ANSWER#${game.gameId}#${questionNumber}` }
        });
        if (qAnswers && qAnswers.length > 0) {
          // Count how many picked each shuffled answer
          const counts = new Array(shuffledAnswers.length).fill(0);
          let correctCount = 0;
          let totalElapsed = 0;
          let answeredCount = 0;
          for (const a of qAnswers) {
            const idx = shuffledAnswers.indexOf(a.selectedAnswer);
            if (idx >= 0) counts[idx]++;
            if (a.isCorrect) correctCount++;
            if (a.elapsedMs) {
              totalElapsed += a.elapsedMs;
              answeredCount++;
            }
          }
          const total = qAnswers.length;
          answerPercentages = counts.map(c => Math.round((c / total) * 100));
          pctCorrect = Math.round((correctCount / total) * 100);
          avgAnswerTimeSec = answeredCount > 0
            ? Math.round(((totalElapsed / answeredCount) / 1000) * 10) / 10
            : null;
        }
      } catch (err) {
        console.warn('Failed to compute answer percentages:', err.message);
      }
    }

    return response(200, {
      state: 'active_game',
      barCode,
      barName,
      activePlayers: barLeaderboard.length,
      gameId: game.gameId,
      gameStartEpoch: game.startTimeEpoch,
      questionNumber,
      totalQuestions: 15,
      phase: gameState.questionPhase,
      question: currentQ.question,
      category: currentQ.category,
      subcategory: currentQ.subcategory || '',
      difficulty: currentQ.difficulty,
      answers: shuffledAnswers,
      correctIndex: isRevealOrScores ? correctIndex : undefined,
      eliminated,
      correctAnswer,
      answerPercentages,
      pctCorrect,
      avgAnswerTimeSec,
      currentPointsAvailable,
      elapsedSeconds: Math.floor(gameState.elapsedInQuestion / 1000),
      barLeaderboard,
      signage: bar.signage || null,
      logoUrl: bar.logoUrl || null,
      logoHash: bar.logoHash || null
    });
  } catch (err) {
    console.error('get-tv-state error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
};
