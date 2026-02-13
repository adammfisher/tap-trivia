'use strict';

const crypto = require('crypto');
const { TABLE, get, put, query, scan, batchWrite } = require('./shared/dynamo');
const { QUESTION_DURATION_MS, DIFFICULTY_RAMP, gameTimeslotPK } = require('./shared/game-clock');
const {
  selectQuestionsForGame,
  getCategoryUsage
} = require('./shared/questions');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

/**
 * Determine whether US Eastern is in DST (UTC-4) or EST (UTC-5).
 * DST runs roughly March through November.
 * Returns 4 for EDT, 5 for EST.
 */
function getETOffsetHours() {
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const month = etNow.getMonth(); // 0-indexed: Jan=0, Dec=11
  // DST is active Mar (2) through Nov (10) approximately
  return (month >= 2 && month <= 10) ? 4 : 5;
}

/**
 * Generate 52 timeslots for today's games.
 * Starts at 9:00 AM ET, every 15 minutes, 52 slots (last at 9:45 PM ET).
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
  for (let i = 0; i < 52; i++) {
    const minutesAfter9AM = i * 15;
    const totalMinutes = 9 * 60 + minutesAfter9AM; // 09:00 + offset
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    // Create UTC time by adding ET offset
    const utcEpoch = Date.UTC(year, month, day, hour + etOffsetHours, minute, 0, 0);
    slots.push(utcEpoch);
  }
  return slots;
}

/**
 * Load all category usage records from the QuestionUsage table.
 * Returns a Map of category -> Set of used question IDs.
 */
async function loadCategoryUsage() {
  const usageItems = await scan(TABLE.QUESTION_USAGE);
  const usageMap = new Map();

  for (const item of usageItems) {
    // PK format: USAGE#CategoryName
    const category = item.PK.replace('USAGE#', '');
    // DynamoDB Sets come back as arrays or Sets depending on marshalling
    let usedIds;
    if (item.usedQuestionIds instanceof Set) {
      usedIds = item.usedQuestionIds;
    } else if (Array.isArray(item.usedQuestionIds)) {
      usedIds = new Set(item.usedQuestionIds);
    } else {
      usedIds = new Set();
    }
    usageMap.set(category, usedIds);
  }

  return usageMap;
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
 * EventBridge triggered Lambda — runs daily at 8 AM ET.
 * Generates 52 games for today's schedule (9:00 AM - 9:45 PM ET).
 */
exports.handler = async (event) => {
  console.log('generate-games invoked', JSON.stringify(event));

  const startTime = Date.now();
  const slots = getTonightSlots();
  console.log(`Generated ${slots.length} timeslots. First: ${new Date(slots[0]).toISOString()}, Last: ${new Date(slots[slots.length - 1]).toISOString()}`);

  // Load all categories and usage data
  const allCategories = await getAllCategories();
  if (allCategories.length === 0) {
    console.error('No categories found in QuestionUsage table. Aborting.');
    return response(500, { error: 'NO_CATEGORIES', message: 'No categories found' });
  }
  console.log(`Found ${allCategories.length} categories`);

  const usageMap = await loadCategoryUsage();

  // Track all question IDs used across tonight's games
  const tonightUsedIds = new Set();
  // Track question IDs used per category for usage update
  const categoryQuestionsUsed = new Map(); // category -> Set of questionIds

  const games = [];
  let failedSlots = 0;

  // Question query cache shared across all games for performance
  const questionCache = new Map();

  for (let i = 0; i < slots.length; i++) {
    const slotEpoch = slots[i];

    try {
      // Select 15 questions for this game
      const questions = await selectQuestionsForGame(
        allCategories,
        usageMap,
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

      // Track usage per category for post-generation update
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

  // Batch write all games (in chunks of 25)
  if (games.length > 0) {
    try {
      await batchWrite(TABLE.GAMES, games);
      console.log(`Successfully wrote ${games.length} games to DynamoDB`);
    } catch (err) {
      console.error('Failed to batch write games:', err);
      return response(500, { error: 'WRITE_FAILED', message: 'Failed to write games to database' });
    }
  }

  // Update QuestionUsage: add all used questionIds to each category's usedQuestionIds set
  const usageUpdatePromises = [];
  for (const [category, questionIds] of categoryQuestionsUsed.entries()) {
    if (questionIds.size === 0) continue;

    const usageUpdate = (async () => {
      try {
        const existing = await getCategoryUsage(category);
        const existingIds = existing.usedQuestionIds instanceof Set
          ? existing.usedQuestionIds
          : new Set(Array.isArray(existing.usedQuestionIds) ? existing.usedQuestionIds : []);

        // Merge new IDs into existing set
        for (const id of questionIds) {
          existingIds.add(id);
        }

        await put(TABLE.QUESTION_USAGE, {
          PK: `USAGE#${category}`,
          usedQuestionIds: Array.from(existingIds),
          totalInCategory: existing.totalInCategory || 0,
          cycleNumber: existing.cycleNumber || 0,
          lastUpdated: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Failed to update usage for category "${category}":`, err.message);
      }
    })();

    usageUpdatePromises.push(usageUpdate);
  }

  await Promise.all(usageUpdatePromises);

  // Log summary
  const totalQuestionsUsed = tonightUsedIds.size;
  const categoriesHit = categoryQuestionsUsed.size;
  const elapsed = Date.now() - startTime;

  console.log(`=== Generate Games Summary ===`);
  console.log(`Games created: ${games.length}/${slots.length}`);
  console.log(`Failed slots: ${failedSlots}`);
  console.log(`Total unique questions used: ${totalQuestionsUsed}`);
  console.log(`Categories hit: ${categoriesHit}`);
  console.log(`Execution time: ${elapsed}ms`);

  return response(200, {
    gamesCreated: games.length,
    totalSlots: slots.length,
    failedSlots,
    questionsUsed: totalQuestionsUsed,
    categoriesHit,
    executionTimeMs: elapsed
  });
};
