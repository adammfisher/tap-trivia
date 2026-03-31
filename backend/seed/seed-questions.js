/**
 * Tap Trivia — Seed Questions Script
 * Reads trivia_questions.json from project root and loads into DynamoDB.
 * Supports incremental loading (skips existing questions to preserve usage data).
 *
 * Usage:
 *   node seed-questions.js --local             (DynamoDB Local on port 8000)
 *   node seed-questions.js --stage prod        (AWS DynamoDB, full overwrite)
 *   node seed-questions.js --stage prod --incremental  (skip existing questions)
 *   node seed-questions.js --stage prod --wipe --source docs/sample_10000.json  (wipe + reseed)
 */

const path = require('path');
const fs = require('fs');

// Parse args
const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const isIncremental = args.includes('--incremental');
const isWipe = args.includes('--wipe');
const stageIdx = args.indexOf('--stage');
const stage = stageIdx >= 0 ? args[stageIdx + 1] : 'prod';
const sourceIdx = args.indexOf('--source');
const sourcePath = sourceIdx >= 0 ? args[sourceIdx + 1] : null;

if (isLocal) {
  process.env.DYNAMODB_LOCAL = 'true';
}

const { TABLE, docClient, BatchWriteCommand, batchWrite, scan, get, put } = require('../shared/dynamo');

const QUESTIONS_FILE = sourcePath
  ? path.resolve(process.cwd(), sourcePath)
  : path.resolve(__dirname, '../../trivia_questions.json');

async function seed() {
  console.log(`\nTap Trivia — Seed Questions`);
  console.log(`Mode: ${isLocal ? 'DynamoDB Local' : `AWS (${stage})`}`);
  console.log(`Incremental: ${isIncremental ? 'YES (skip existing)' : 'NO (overwrite)'}`);
  console.log(`Wipe: ${isWipe ? 'YES (delete all before seeding)' : 'NO'}`);
  console.log(`Source: ${QUESTIONS_FILE}\n`);

  // Wipe existing questions and usage data if --wipe flag is set
  if (isWipe) {
    async function batchDelete(tableName, items) {
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const deleteRequests = batch.map(item => ({
          DeleteRequest: { Key: { PK: item.PK } }
        }));
        await docClient.send(new BatchWriteCommand({
          RequestItems: { [tableName]: deleteRequests }
        }));
        if ((i + 25) % 1000 < 25 || i + 25 >= items.length) {
          console.log(`  Deleted ${Math.min(i + 25, items.length)}/${items.length}`);
        }
      }
    }

    console.log('Wiping all existing questions...');
    const existingQuestions = await scan(TABLE.QUESTIONS, { ProjectionExpression: 'PK' });
    console.log(`  Found ${existingQuestions.length} questions to delete`);
    await batchDelete(TABLE.QUESTIONS, existingQuestions);
    console.log('  Questions wiped.\n');

    console.log('Wiping all question usage data...');
    const existingUsage = await scan(TABLE.QUESTION_USAGE, { ProjectionExpression: 'PK' });
    console.log(`  Found ${existingUsage.length} usage records to delete`);
    await batchDelete(TABLE.QUESTION_USAGE, existingUsage);
    console.log('  Usage data wiped.\n');
  }

  // Read questions file
  if (!fs.existsSync(QUESTIONS_FILE)) {
    console.error(`ERROR: ${QUESTIONS_FILE} not found`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  console.log(`Found ${raw.length} questions in file\n`);

  // Transform to DynamoDB format (handles both old and new JSON schemas)
  const allItems = raw.map(q => {
    let wrongAnswers = q.wrongAnswers || q.wrong_answers;
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
      topicLeaf: q.topicLeaf || q.topic_leaf || '',
      funFact: q.funFact || q.fun_fact || (args.includes('--filler-funfact') ? 'This is a fun fact placeholder — real fun facts will appear once the full question set is loaded.' : ''),
      difficulty: q.difficulty,
      difficultySort: `${q.difficulty}#${q.id}`,
      sourceType: q.sourceType || q.source_type || 'static',
      shelfLife: q.shelfLife || q.shelf_life || 'permanent',
      expired: q.expired || 0,
      createdAt: q.createdAt || q.created_at || new Date().toISOString(),
      lastUsedEpoch: 0,
      usageCount: 0
    };
  });

  // In incremental mode, check which questions already exist and skip them
  let itemsToWrite = allItems;
  if (isIncremental) {
    console.log('Checking for existing questions...');
    const toSkip = new Set();
    let checked = 0;

    // Check in batches of 100 (parallel gets)
    for (let i = 0; i < allItems.length; i += 100) {
      const batch = allItems.slice(i, i + 100);
      const results = await Promise.all(
        batch.map(item => get(TABLE.QUESTIONS, { PK: item.PK }))
      );
      results.forEach((existing, idx) => {
        if (existing) toSkip.add(batch[idx].PK);
      });
      checked += batch.length;
      if (checked % 1000 === 0 || checked === allItems.length) {
        console.log(`  Checked ${checked}/${allItems.length} — ${toSkip.size} existing`);
      }
    }

    itemsToWrite = allItems.filter(item => !toSkip.has(item.PK));
    console.log(`\nSkipping ${toSkip.size} existing questions, writing ${itemsToWrite.length} new\n`);
  }

  // Batch write questions
  if (itemsToWrite.length > 0) {
    console.log(`Writing ${itemsToWrite.length} questions to ${TABLE.QUESTIONS}...`);
    let written = 0;
    const chunkSize = 25;
    for (let i = 0; i < itemsToWrite.length; i += chunkSize) {
      const chunk = itemsToWrite.slice(i, i + chunkSize);
      await batchWrite(TABLE.QUESTIONS, chunk);
      written += chunk.length;
      if (written % 1000 === 0 || written === itemsToWrite.length) {
        console.log(`  Written ${written}/${itemsToWrite.length}`);
      }
    }
    console.log(`Done!\n`);
  } else {
    console.log('No new questions to write.\n');
  }

  // Initialize/update QuestionUsage per category (always recalculate from all items)
  const categories = {};
  allItems.forEach(q => {
    if (!categories[q.category]) categories[q.category] = 0;
    categories[q.category]++;
  });

  console.log(`Updating QuestionUsage for ${Object.keys(categories).length} categories...`);
  for (const [category, count] of Object.entries(categories)) {
    const existing = await get(TABLE.QUESTION_USAGE, { PK: `USAGE#${category}` });
    if (existing && isIncremental) {
      // Just update totalInCategory, preserve other fields
      await put(TABLE.QUESTION_USAGE, {
        ...existing,
        totalInCategory: count,
        lastUpdated: new Date().toISOString()
      });
    } else {
      await put(TABLE.QUESTION_USAGE, {
        PK: `USAGE#${category}`,
        usedQuestionIds: [],
        totalInCategory: count,
        cycleNumber: 0,
        lastUpdated: new Date().toISOString()
      });
    }
  }
  console.log(`Done!\n`);

  // Print summary
  console.log('=== SUMMARY ===');
  console.log(`Total questions in file: ${allItems.length}`);
  console.log(`Questions written: ${itemsToWrite.length}`);

  console.log('\nBy category:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  const byDifficulty = {};
  allItems.forEach(q => {
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
