/**
 * Tap Trivia — Question Selection Algorithm
 * Used by generate-games Lambda to select questions for nightly games.
 */

const { TABLE, query, get, put } = require('./dynamo');
const { DIFFICULTY_RAMP } = require('./game-clock');

// Category rules: at least 8 different categories, max 2 per category per game
const MIN_CATEGORIES_PER_GAME = 8;
const MAX_PER_CATEGORY = 2;

/**
 * Query available questions for a category + difficulty from the GSI.
 * Returns questions not in the usedIds set.
 */
async function getAvailableQuestions(category, difficulty, usedIds) {
  const items = await query(TABLE.QUESTIONS, {
    IndexName: 'category-difficulty-index',
    KeyConditionExpression: 'category = :cat AND begins_with(difficultySort, :diff)',
    ExpressionAttributeValues: {
      ':cat': category,
      ':diff': `${difficulty}#`
    }
  });

  return items.filter(q => !usedIds.has(q.questionId));
}

/**
 * Get all questions at a given difficulty level (any category).
 */
async function getQuestionsByDifficulty(difficulty, usedIds) {
  // Scan the GSI filtering by difficulty prefix
  const items = await query(TABLE.QUESTIONS, {
    IndexName: 'category-difficulty-index',
    KeyConditionExpression: 'category = :cat AND begins_with(difficultySort, :diff)',
    ExpressionAttributeValues: {
      ':cat': '', // This won't work for scan across all categories
      ':diff': `${difficulty}#`
    }
  });
  return items.filter(q => !usedIds.has(q.questionId));
}

/**
 * Get the usage tracking for a category.
 */
async function getCategoryUsage(category) {
  const item = await get(TABLE.QUESTION_USAGE, { PK: `USAGE#${category}` });
  return item || {
    PK: `USAGE#${category}`,
    usedQuestionIds: new Set(),
    totalInCategory: 0,
    cycleNumber: 0,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Select 15 questions for one game following the difficulty ramp and category rules.
 *
 * @param {string[]} allCategories - All available categories
 * @param {Map<string, Set<number>>} usageMap - category -> set of used question IDs
 * @param {Set<number>} gameUsedIds - IDs already used in tonight's games
 * @param {Map<string, object[]>} questionCache - category#difficulty -> questions array
 */
async function selectQuestionsForGame(allCategories, usageMap, gameUsedIds, questionCache) {
  const selected = [];
  const categoriesUsedInGame = {};

  // Shuffle categories for variety
  const shuffledCategories = [...allCategories].sort(() => Math.random() - 0.5);

  for (let qNum = 1; qNum <= 15; qNum++) {
    const targetDifficulty = DIFFICULTY_RAMP[qNum - 1];
    let question = null;

    // Try each category (shuffled) to find one that works
    for (const category of shuffledCategories) {
      if ((categoriesUsedInGame[category] || 0) >= MAX_PER_CATEGORY) continue;

      const cacheKey = `${category}#${targetDifficulty}`;
      if (!questionCache.has(cacheKey)) {
        const usedIds = usageMap.get(category) || new Set();
        const combinedUsed = new Set([...usedIds, ...gameUsedIds]);
        const available = await getAvailableQuestions(category, targetDifficulty, combinedUsed);
        questionCache.set(cacheKey, available);
      }

      const available = questionCache.get(cacheKey).filter(q => !gameUsedIds.has(q.questionId));
      if (available.length > 0) {
        question = available[Math.floor(Math.random() * available.length)];
        break;
      }
    }

    // Fallback: widen difficulty ±1
    if (!question) {
      for (const diffOffset of [-1, 1, -2, 2]) {
        const fallbackDiff = targetDifficulty + diffOffset;
        if (fallbackDiff < 1 || fallbackDiff > 5) continue;

        for (const category of shuffledCategories) {
          if ((categoriesUsedInGame[category] || 0) >= MAX_PER_CATEGORY) continue;

          const cacheKey = `${category}#${fallbackDiff}`;
          if (!questionCache.has(cacheKey)) {
            const usedIds = usageMap.get(category) || new Set();
            const combinedUsed = new Set([...usedIds, ...gameUsedIds]);
            const available = await getAvailableQuestions(category, fallbackDiff, combinedUsed);
            questionCache.set(cacheKey, available);
          }

          const available = questionCache.get(cacheKey).filter(q => !gameUsedIds.has(q.questionId));
          if (available.length > 0) {
            question = available[Math.floor(Math.random() * available.length)];
            break;
          }
        }
        if (question) break;
      }
    }

    // Last resort: reset usage for exhausted categories and pick any
    if (!question) {
      for (const category of shuffledCategories) {
        if ((categoriesUsedInGame[category] || 0) >= MAX_PER_CATEGORY) continue;

        // Clear usage for this category and retry
        usageMap.set(category, new Set());
        const cacheKey = `${category}#${targetDifficulty}`;
        const available = await getAvailableQuestions(category, targetDifficulty, gameUsedIds);
        questionCache.set(cacheKey, available);

        const filtered = available.filter(q => !gameUsedIds.has(q.questionId));
        if (filtered.length > 0) {
          question = filtered[Math.floor(Math.random() * filtered.length)];
          break;
        }
      }
    }

    // Final fallback: allow reuse from previous games AND relax category limit
    // (small pool graceful handling — only prevent duplicates within THIS game)
    if (!question) {
      const thisGameIds = new Set(selected.map(q => q.questionId));
      for (const diffOffset of [0, -1, 1, -2, 2]) {
        const fallbackDiff = targetDifficulty + diffOffset;
        if (fallbackDiff < 1 || fallbackDiff > 5) continue;

        for (const category of shuffledCategories) {
          // Relax MAX_PER_CATEGORY — allow up to 4 per category as last resort
          if ((categoriesUsedInGame[category] || 0) >= 4) continue;

          const available = await getAvailableQuestions(category, fallbackDiff, thisGameIds);
          if (available.length > 0) {
            question = available[Math.floor(Math.random() * available.length)];
            break;
          }
        }
        if (question) break;
      }
    }

    if (!question) {
      throw new Error(`Could not find question for position ${qNum} (difficulty ${targetDifficulty})`);
    }

    // Generate elimination order: pick 2 of 3 wrong answers to eliminate
    const wrongAnswers = question.wrongAnswers || [];
    const eliminateOrder = generateEliminateOrder(wrongAnswers.length);

    selected.push({
      num: qNum,
      questionId: question.questionId,
      category: question.category,
      subcategory: question.subcategory || '',
      difficulty: question.difficulty,
      question: question.question,
      answer: question.answer,
      wrongAnswers: wrongAnswers,
      eliminateOrder
    });

    gameUsedIds.add(question.questionId);
    categoriesUsedInGame[question.category] = (categoriesUsedInGame[question.category] || 0) + 1;
  }

  return selected;
}

/**
 * Generate elimination order: randomly pick 2 of 3 wrong answer indices.
 */
function generateEliminateOrder(wrongCount) {
  if (wrongCount < 3) return [0, 1];
  const indices = [0, 1, 2];
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [indices[0], indices[1]];
}

module.exports = {
  selectQuestionsForGame,
  getAvailableQuestions,
  getCategoryUsage,
  generateEliminateOrder,
  MIN_CATEGORIES_PER_GAME,
  MAX_PER_CATEGORY
};
