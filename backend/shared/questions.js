/**
 * Tap Trivia — Question Selection Algorithm (LRU-based)
 * Used by generate-games Lambda to select questions for nightly games.
 *
 * Strategy: always prefer questions with the lowest lastUsedEpoch (never-used first).
 * Picks randomly from the bottom 30% of least-recently-used to add variety.
 */

const { TABLE, query } = require('./dynamo');
const { DIFFICULTY_RAMP } = require('./game-clock');

const MAX_PER_CATEGORY = 2;

/**
 * Query all questions for a category + difficulty from the GSI (paginated).
 */
async function queryQuestions(category, difficulty) {
  return query(TABLE.QUESTIONS, {
    IndexName: 'category-difficulty-index',
    KeyConditionExpression: 'category = :cat AND begins_with(difficultySort, :diff)',
    ExpressionAttributeValues: {
      ':cat': category,
      ':diff': `${difficulty}#`
    }
  });
}

/**
 * LRU pick: from a list of questions, exclude tonight's used IDs,
 * sort by lastUsedEpoch ascending, then pick randomly from the bottom 30%.
 */
function lruPick(questions, tonightUsedIds) {
  const available = questions.filter(q => !tonightUsedIds.has(q.questionId));
  if (available.length === 0) return null;

  // Sort by lastUsedEpoch ascending (0 = never used = highest priority)
  available.sort((a, b) => (a.lastUsedEpoch || 0) - (b.lastUsedEpoch || 0));

  // Pick randomly from the bottom 30% (at least 1)
  const poolSize = Math.max(1, Math.ceil(available.length * 0.3));
  const pool = available.slice(0, poolSize);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Select 15 questions for one game following the difficulty ramp and category rules.
 *
 * @param {string[]} allCategories - All available categories
 * @param {Set<number>} tonightUsedIds - IDs already used in tonight's games
 * @param {Map<string, object[]>} questionCache - category#difficulty -> questions array
 */
async function selectQuestionsForGame(allCategories, tonightUsedIds, questionCache) {
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
        questionCache.set(cacheKey, await queryQuestions(category, targetDifficulty));
      }

      question = lruPick(questionCache.get(cacheKey), tonightUsedIds);
      if (question) break;
    }

    // Fallback: widen difficulty ±1, ±2
    if (!question) {
      for (const diffOffset of [-1, 1, -2, 2]) {
        const fallbackDiff = targetDifficulty + diffOffset;
        if (fallbackDiff < 1 || fallbackDiff > 3) continue;

        for (const category of shuffledCategories) {
          if ((categoriesUsedInGame[category] || 0) >= MAX_PER_CATEGORY) continue;

          const cacheKey = `${category}#${fallbackDiff}`;
          if (!questionCache.has(cacheKey)) {
            questionCache.set(cacheKey, await queryQuestions(category, fallbackDiff));
          }

          question = lruPick(questionCache.get(cacheKey), tonightUsedIds);
          if (question) break;
        }
        if (question) break;
      }
    }

    // Last resort: relax category limit to 4, any difficulty
    if (!question) {
      const thisGameIds = new Set(selected.map(q => q.questionId));
      for (const diffOffset of [0, -1, 1, -2, 2]) {
        const fallbackDiff = targetDifficulty + diffOffset;
        if (fallbackDiff < 1 || fallbackDiff > 3) continue;

        for (const category of shuffledCategories) {
          if ((categoriesUsedInGame[category] || 0) >= 4) continue;

          const cacheKey = `${category}#${fallbackDiff}`;
          if (!questionCache.has(cacheKey)) {
            questionCache.set(cacheKey, await queryQuestions(category, fallbackDiff));
          }

          // Only exclude this game's questions (allow cross-night repeats as last resort)
          const available = questionCache.get(cacheKey).filter(q => !thisGameIds.has(q.questionId));
          if (available.length > 0) {
            available.sort((a, b) => (a.lastUsedEpoch || 0) - (b.lastUsedEpoch || 0));
            question = available[0];
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
      funFact: question.funFact || '',
      eliminateOrder
    });

    tonightUsedIds.add(question.questionId);
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
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [indices[0], indices[1]];
}

module.exports = {
  selectQuestionsForGame,
  queryQuestions,
  lruPick,
  generateEliminateOrder,
  MAX_PER_CATEGORY
};
