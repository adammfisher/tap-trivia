'use strict';

const { TABLE, get, query } = require('./shared/dynamo');
const { getGameState, getNextGameTime, gameTimeslotPK, GAME_DURATION_MS, RESULTS_DURATION_MS } = require('./shared/game-clock');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    const now = Date.now();

    // --- Ad-hoc test game override ---
    const adhocGame = await get(TABLE.GAMES, { PK: 'ADHOC_GAME' });
    if (adhocGame) {
      const adhocState = getGameState(adhocGame.startTimeEpoch, now);
      if (adhocState.gamePhase === 'active' || adhocState.gamePhase === 'pre_game') {
        return response(200, {
          gameId: adhocGame.gameId,
          status: adhocState.gamePhase === 'active' ? 'active' : 'scheduled',
          startTimeEpoch: adhocGame.startTimeEpoch,
          currentQuestionNumber: adhocState.questionNumber || null,
          totalQuestions: 15,
          secondsUntilStart: adhocState.secondsUntilStart || null
        });
      }
      // Still within results window — report as completed but still current
      if (adhocState.gamePhase === 'post_game') {
        const gameEndEpoch = adhocGame.startTimeEpoch + GAME_DURATION_MS;
        if (now - gameEndEpoch < RESULTS_DURATION_MS) {
          return response(200, {
            gameId: adhocGame.gameId,
            status: 'completed',
            startTimeEpoch: adhocGame.startTimeEpoch,
            currentQuestionNumber: null,
            totalQuestions: 15,
            secondsUntilStart: null
          });
        }
      }
    }

    // Get the current or next game timeslot
    const gameStartEpoch = getNextGameTime(now);
    const pk = gameTimeslotPK(gameStartEpoch);

    // Query the Games table for this timeslot
    const game = await get(TABLE.GAMES, { PK: pk });

    if (!game) {
      return response(200, {
        status: 'no_game',
        message: 'No game scheduled',
        nextGameStartEpoch: gameStartEpoch,
        secondsUntilStart: Math.ceil((gameStartEpoch - now) / 1000)
      });
    }

    // Determine the current game state
    const state = getGameState(game.startTimeEpoch, now);

    let status;
    if (state.gamePhase === 'active') {
      status = 'active';
    } else if (state.gamePhase === 'pre_game') {
      status = 'scheduled';
    } else {
      status = 'completed';
    }

    return response(200, {
      gameId: game.gameId,
      status,
      startTimeEpoch: game.startTimeEpoch,
      currentQuestionNumber: state.questionNumber || null,
      totalQuestions: 15,
      secondsUntilStart: state.secondsUntilStart || null
    });
  } catch (err) {
    console.error('get-current-game error:', err);
    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  }
};
