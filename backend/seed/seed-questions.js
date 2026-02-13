/**
 * Tap Trivia — Seed Questions Script
 * Reads trivia_questions.json from project root and loads into DynamoDB.
 *
 * Usage:
 *   node seed-questions.js --local       (DynamoDB Local on port 8000)
 *   node seed-questions.js --stage prod  (AWS DynamoDB)
 */

const path = require('path');
const fs = require('fs');

// Parse args
const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const stageIdx = args.indexOf('--stage');
const stage = stageIdx >= 0 ? args[stageIdx + 1] : 'prod';

if (isLocal) {
  process.env.DYNAMODB_LOCAL = 'true';
}

const { TABLE, batchWrite, put } = require('../shared/dynamo');

const QUESTIONS_FILE = path.resolve(__dirname, '../../trivia_questions.json');

async function seed() {
  console.log(`\nTap Trivia — Seed Questions`);
  console.log(`Mode: ${isLocal ? 'DynamoDB Local' : `AWS (${stage})`}`);
  console.log(`Source: ${QUESTIONS_FILE}\n`);

  // Read questions file
  if (!fs.existsSync(QUESTIONS_FILE)) {
    console.error(`ERROR: ${QUESTIONS_FILE} not found`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  console.log(`Found ${raw.length} questions in file\n`);

  // Transform to DynamoDB format
  const items = raw.map(q => {
    // wrong_answers might be a JSON string or already an array
    let wrongAnswers = q.wrong_answers;
    if (typeof wrongAnswers === 'string') {
      wrongAnswers = JSON.parse(wrongAnswers);
    }

    return {
      PK: `Q#${q.id}`,
      questionId: q.id,
      question: q.question,
      answer: q.answer,
      wrongAnswers: wrongAnswers,
      category: q.category,
      subcategory: q.subcategory || '',
      topicLeaf: q.topic_leaf || '',
      difficulty: q.difficulty,
      // Composite sort key for GSI: "difficulty#questionId"
      difficultySort: `${q.difficulty}#${q.id}`,
      sourceType: q.source_type || 'static',
      shelfLife: q.shelf_life || 'permanent',
      expired: q.expired || 0,
      createdAt: q.created_at || new Date().toISOString()
    };
  });

  // Batch write to Questions table
  console.log(`Writing ${items.length} questions to ${TABLE.QUESTIONS}...`);
  await batchWrite(TABLE.QUESTIONS, items);
  console.log(`Done!\n`);

  // Initialize QuestionUsage per category
  const categories = {};
  items.forEach(q => {
    if (!categories[q.category]) categories[q.category] = 0;
    categories[q.category]++;
  });

  console.log(`Initializing QuestionUsage for ${Object.keys(categories).length} categories...`);
  for (const [category, count] of Object.entries(categories)) {
    await put(TABLE.QUESTION_USAGE, {
      PK: `USAGE#${category}`,
      usedQuestionIds: [],  // Empty list — DynamoDB doesn't allow empty Sets
      totalInCategory: count,
      cycleNumber: 0,
      lastUpdated: new Date().toISOString()
    });
  }
  console.log(`Done!\n`);

  // Print summary
  console.log('=== SUMMARY ===');
  console.log(`Total questions loaded: ${items.length}`);
  console.log('\nBy category:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  const byDifficulty = {};
  items.forEach(q => {
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
  });

  console.log('\nBy difficulty:');
  Object.entries(byDifficulty)
    .sort((a, b) => a[0] - b[0])
    .forEach(([diff, count]) => {
      console.log(`  Level ${diff}: ${count}`);
    });

  console.log('\nSeed complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
