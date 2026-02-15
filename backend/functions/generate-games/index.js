'use strict';

const crypto = require('crypto');
const { TABLE, get, put, scan, batchWrite, update } = require('./shared/dynamo');
const { QUESTION_DURATION_MS, DIFFICULTY_RAMP, gameTimeslotPK } = require('./shared/game-clock');
const { selectQuestionsForGame } = require('./shared/questions');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

/**
 * Determine whether US Eastern is in DST (UTC-4) or EST (UTC-5).
 */
function getETOffsetHours() {
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const month = etNow.getMonth();
  return (month >= 2 && month <= 10) ? 4 : 5;
}

/**
 * Generate 44 timeslots for today's games.
 * 10:00 AM ET to 8:45 PM ET, every 15 minutes.
 * Returns array of UTC epoch milliseconds.
 */
function getTonightSlots() {
  const etOffsetHours = getETOffsetHours();
  const now = new Date();

  // Get today's date in ET
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etNow.getFullYear();
  const month = etNow.getMonth();
  const day = etNow.getDate();

  const slots = [];
  for (let i = 0; i < 44; i++) {
    const minutesAfter10AM = i * 15;
    const hour = 10 + Math.floor(minutesAfter10AM / 60);
    const minute = minutesAfter10AM % 60;

    const utcEpoch = Date.UTC(year, month, day, hour + etOffsetHours, minute, 0, 0);
    slots.push(utcEpoch);
  }
  return slots;
}

/**
 * Get all distinct categories from the QuestionUsage table.
 */
async function getAllCategories() {
  const usageItems = await scan(TABLE.QUESTION_USAGE, {
    ProjectionExpression: 'PK'
  });
  return usageItems.map(item => item.PK.replace('USAGE#', ''));
}

/**
 * Batch update lastUsedEpoch and usageCount on selected questions.
 */
async function updateQuestionUsage(questionIds) {
  const now = Date.now();
  const chunks = [];
  for (let i = 0; i < questionIds.length; i += 25) {
    chunks.push(questionIds.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(qId =>
      update(TABLE.QUESTIONS, { PK: `Q#${qId}` },
        'SET lastUsedEpoch = :now, usageCount = if_not_exists(usageCount, :zero) + :one',
        { ':now': now, ':zero': 0, ':one': 1 }
      )
    ));
  }
}

/**
 * Update QuestionUsage monitoring records (category-level stats).
 */
async function updateCategoryStats(categoryQuestionsUsed) {
  const promises = [];
  for (const [category, questionIds] of categoryQuestionsUsed.entries()) {
    if (questionIds.size === 0) continue;
    promises.push(
      update(TABLE.QUESTION_USAGE, { PK: `USAGE#${category}` },
        'SET lastUpdated = :now, usedTonight = :count',
        { ':now': new Date().toISOString(), ':count': questionIds.size }
      ).catch(err => console.error(`Failed to update usage for "${category}":`, err.message))
    );
  }
  await Promise.all(promises);
}

/**
 * EventBridge triggered Lambda — runs daily at 9 AM ET.
 * Generates 44 games for today's schedule (10:00 AM – 8:45 PM ET).
 */
exports.handler = async (event) => {
  console.log('generate-games invoked', JSON.stringify(event));

  const startTime = Date.now();
  const slots = getTonightSlots();
  console.log(`Generated ${slots.length} timeslots. First: ${new Date(slots[0]).toISOString()}, Last: ${new Date(slots[slots.length - 1]).toISOString()}`);

  // Load all categories
  const allCategories = await getAllCategories();
  if (allCategories.length === 0) {
    console.error('No categories found in QuestionUsage table. Aborting.');
    return response(500, { error: 'NO_CATEGORIES', message: 'No categories found' });
  }
  console.log(`Found ${allCategories.length} categories`);

  // Track all question IDs used across tonight's games
  const tonightUsedIds = new Set();
  // Track question IDs used per category for monitoring
  const categoryQuestionsUsed = new Map();

  const games = [];
  let failedSlots = 0;

  // Question query cache shared across all games for performance
  const questionCache = new Map();

  for (let i = 0; i < slots.length; i++) {
    const slotEpoch = slots[i];

    try {
      const questions = await selectQuestionsForGame(
        allCategories,
        tonightUsedIds,
        questionCache
      );

      const gameId = crypto.randomUUID();
      const pk = gameTimeslotPK(slotEpoch);

      const gameItem = {
        PK: pk,
        gameId,
        startTime: new Date(slotEpoch).toISOString(),
        startTimeEpoch: slotEpoch,
        questions,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        ttl: Math.floor(slotEpoch / 1000) + 7 * 24 * 3600
      };

      games.push(gameItem);

      // Track usage per category for monitoring
      for (const q of questions) {
        if (!categoryQuestionsUsed.has(q.category)) {
          categoryQuestionsUsed.set(q.category, new Set());
        }
        categoryQuestionsUsed.get(q.category).add(q.questionId);
      }
    } catch (err) {
      failedSlots++;
      console.error(`Failed to generate game for slot ${i} (${new Date(slotEpoch).toISOString()}):`, err.message);
    }
  }

  // Batch write all games
  if (games.length > 0) {
    try {
      await batchWrite(TABLE.GAMES, games);
      console.log(`Successfully wrote ${games.length} games to DynamoDB`);
    } catch (err) {
      console.error('Failed to batch write games:', err);
      return response(500, { error: 'WRITE_FAILED', message: 'Failed to write games to database' });
    }
  }

  // Update lastUsedEpoch + usageCount on all selected questions
  const allUsedIds = Array.from(tonightUsedIds);
  console.log(`Updating LRU timestamps on ${allUsedIds.length} questions...`);
  try {
    await updateQuestionUsage(allUsedIds);
    console.log('LRU timestamps updated');
  } catch (err) {
    console.error('Failed to update question usage:', err.message);
  }

  // Update category-level monitoring stats
  await updateCategoryStats(categoryQuestionsUsed);

  // Log summary
  const elapsed = Date.now() - startTime;
  console.log(`=== Generate Games Summary ===`);
  console.log(`Games created: ${games.length}/${slots.length}`);
  console.log(`Failed slots: ${failedSlots}`);
  console.log(`Total unique questions used: ${tonightUsedIds.size}`);
  console.log(`Categories hit: ${categoryQuestionsUsed.size}`);
  console.log(`Execution time: ${elapsed}ms`);

  return response(200, {
    gamesCreated: games.length,
    totalSlots: slots.length,
    failedSlots,
    questionsUsed: tonightUsedIds.size,
    categoriesHit: categoryQuestionsUsed.size,
    executionTimeMs: elapsed
  });
};
