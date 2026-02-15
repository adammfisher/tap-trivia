#!/usr/bin/env node
'use strict';

/**
 * Tap Trivia -- Ad-Hoc Test Game Utility
 *
 * Creates or removes an ADHOC_GAME record in the Games DynamoDB table,
 * allowing full gameplay testing outside the 9 AM - 10 PM ET window.
 *
 * Usage:
 *   node scripts/start-test-game.js [start]   Start a test game (90s countdown)
 *   node scripts/start-test-game.js stop       Stop/delete the test game
 *   node scripts/start-test-game.js status     Check current ad-hoc game status
 */

const crypto = require('crypto');
const path = require('path');

// Shared modules from backend
const { TABLE, get, put, scan, docClient, DeleteCommand } = require(
  path.resolve(__dirname, '../backend/shared/dynamo')
);
const { getGameState, GAME_DURATION_MS } = require(
  path.resolve(__dirname, '../backend/shared/game-clock')
);
const { selectQuestionsForGame } = require(
  path.resolve(__dirname, '../backend/shared/questions')
);

const ADHOC_PK = 'ADHOC_GAME';
const COUNTDOWN_SECONDS = 90;
const TTL_HOURS = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdhocGame() {
  return get(TABLE.GAMES, { PK: ADHOC_PK });
}

async function deleteAdhocGame() {
  await docClient.send(new DeleteCommand({
    TableName: TABLE.GAMES,
    Key: { PK: ADHOC_PK }
  }));
}

async function getAllCategories() {
  const items = await scan(TABLE.QUESTION_USAGE, { ProjectionExpression: 'PK' });
  return items.map(item => item.PK.replace('USAGE#', ''));
}

function formatET(epoch) {
  return new Date(epoch).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function start() {
  console.log('\n  Tap Trivia -- Ad-Hoc Test Game\n');

  // Check for existing active game
  const existing = await getAdhocGame();
  if (existing) {
    const state = getGameState(existing.startTimeEpoch, Date.now());
    if (state.gamePhase === 'active' || state.gamePhase === 'pre_game') {
      console.log('  An ad-hoc game is already running!');
      console.log(`  Game ID:    ${existing.gameId}`);
      console.log(`  Phase:      ${state.gamePhase}`);
      if (state.questionNumber) console.log(`  Question:   ${state.questionNumber}/15`);
      console.log('\n  Run "node scripts/start-test-game.js stop" first.\n');
      process.exit(1);
    }
    console.log('  (Cleaning up expired ad-hoc game...)\n');
    await deleteAdhocGame();
  }

  // Select questions
  console.log('  Selecting questions...');
  const allCategories = await getAllCategories();
  if (allCategories.length === 0) {
    console.error('  ERROR: No categories found. Run seed-questions.js first.');
    process.exit(1);
  }

  const tonightUsedIds = new Set();
  const questionCache = new Map();

  const questions = await selectQuestionsForGame(
    allCategories, tonightUsedIds, questionCache
  );

  const categories = new Set(questions.map(q => q.category));
  console.log(`  Selected ${questions.length} questions across ${categories.size} categories`);

  // Build game record
  const gameId = crypto.randomUUID();
  const startTimeEpoch = Date.now() + (COUNTDOWN_SECONDS * 1000);
  const endTimeEpoch = startTimeEpoch + GAME_DURATION_MS;
  const ttl = Math.floor(startTimeEpoch / 1000) + (TTL_HOURS * 3600);

  await put(TABLE.GAMES, {
    PK: ADHOC_PK,
    gameId,
    startTime: new Date(startTimeEpoch).toISOString(),
    startTimeEpoch,
    questions,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    ttl
  });

  // Print summary
  console.log('\n  Test game created!\n');
  console.log(`  Game ID:       ${gameId}`);
  console.log(`  Starts in:     ${COUNTDOWN_SECONDS} seconds`);
  console.log(`  Start time:    ${formatET(startTimeEpoch)} ET`);
  console.log(`  End time:      ${formatET(endTimeEpoch)} ET`);
  console.log(`  Auto-expires:  ${TTL_HOURS} hours (DynamoDB TTL)`);
  console.log('');
  console.log('  Questions:');
  for (const q of questions) {
    const truncated = q.question.length > 60 ? q.question.substring(0, 57) + '...' : q.question;
    console.log(`    Q${String(q.num).padStart(2, ' ')}: [${q.difficulty}] ${q.category} -- ${truncated}`);
  }
  console.log('');
  console.log('  Player app: https://d1qwd1uvh2tnf5.cloudfront.net');
  console.log('  TV app:     https://d2lthscxe93vr.cloudfront.net');
  console.log('');
  console.log('  To stop early: node scripts/start-test-game.js stop\n');
}

async function stop() {
  console.log('\n  Tap Trivia -- Stop Ad-Hoc Test Game\n');
  const existing = await getAdhocGame();
  if (!existing) {
    console.log('  No ad-hoc game found. Nothing to stop.\n');
    return;
  }
  await deleteAdhocGame();
  console.log(`  Deleted ad-hoc game: ${existing.gameId}`);
  console.log('  Normal game schedule will resume on next poll.\n');
}

async function status() {
  console.log('\n  Tap Trivia -- Ad-Hoc Game Status\n');
  const existing = await getAdhocGame();
  if (!existing) {
    console.log('  No ad-hoc game exists.\n');
    return;
  }
  const state = getGameState(existing.startTimeEpoch, Date.now());
  console.log(`  Game ID:    ${existing.gameId}`);
  console.log(`  Phase:      ${state.gamePhase}`);
  if (state.gamePhase === 'pre_game') {
    console.log(`  Starts in:  ${state.secondsUntilStart}s`);
  } else if (state.gamePhase === 'active') {
    console.log(`  Question:   ${state.questionNumber}/15`);
    console.log(`  Q-Phase:    ${state.questionPhase}`);
  } else {
    console.log('  (Game is over -- will be ignored by Lambdas)');
  }
  console.log(`  Created:    ${existing.createdAt}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const command = (process.argv[2] || 'start').toLowerCase();

const commands = { start, stop, status };
if (!commands[command]) {
  console.log('Usage: node scripts/start-test-game.js [start|stop|status]');
  process.exit(1);
}

commands[command]().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
