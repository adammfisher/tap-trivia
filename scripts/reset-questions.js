#!/usr/bin/env node
'use strict';

/**
 * Tap Trivia — Reset Question Usage
 *
 * Zeros out lastUsedEpoch and usageCount on every question,
 * and resets all QuestionUsage tracking records.
 * Use this before official launch to start fresh.
 *
 * Usage:
 *   node scripts/reset-questions.js              (with confirmation prompt)
 *   node scripts/reset-questions.js --confirm     (skip prompt)
 *   node scripts/reset-questions.js --local       (DynamoDB Local)
 */

const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const skipPrompt = args.includes('--confirm');

if (isLocal) {
  process.env.DYNAMODB_LOCAL = 'true';
}

const { TABLE, scan, update, put, get } = require(
  path.resolve(__dirname, '../backend/shared/dynamo')
);

async function confirm(message) {
  if (skipPrompt) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function reset() {
  console.log('\n  Tap Trivia — Reset Question Usage\n');
  console.log(`  Mode: ${isLocal ? 'DynamoDB Local' : 'AWS Production'}\n`);

  // Count questions first
  const questions = await scan(TABLE.QUESTIONS, {
    ProjectionExpression: 'PK, lastUsedEpoch, usageCount'
  });

  const withUsage = questions.filter(q => (q.lastUsedEpoch || 0) > 0 || (q.usageCount || 0) > 0);

  console.log(`  Total questions: ${questions.length}`);
  console.log(`  With usage data: ${withUsage.length}`);
  console.log(`  Already clean:   ${questions.length - withUsage.length}\n`);

  if (withUsage.length === 0) {
    console.log('  Nothing to reset. All questions are already clean.\n');
    return;
  }

  const ok = await confirm(`  Reset ${withUsage.length} questions and all usage records? [y/N] `);
  if (!ok) {
    console.log('\n  Aborted.\n');
    return;
  }

  // Reset questions — update lastUsedEpoch and usageCount
  console.log(`\n  Resetting ${withUsage.length} questions...`);
  let updated = 0;
  const chunkSize = 25;

  for (let i = 0; i < withUsage.length; i += chunkSize) {
    const chunk = withUsage.slice(i, i + chunkSize);
    await Promise.all(chunk.map(q =>
      update(TABLE.QUESTIONS, { PK: q.PK },
        'SET lastUsedEpoch = :zero, usageCount = :zero',
        { ':zero': 0 }
      )
    ));
    updated += chunk.length;
    if (updated % 1000 === 0 || updated === withUsage.length) {
      console.log(`    ${updated}/${withUsage.length} questions reset`);
    }
  }

  // Reset QuestionUsage records
  console.log('\n  Resetting QuestionUsage records...');
  const usageRecords = await scan(TABLE.QUESTION_USAGE);
  for (const record of usageRecords) {
    await put(TABLE.QUESTION_USAGE, {
      ...record,
      usedQuestionIds: [],
      cycleNumber: 0,
      usedTonight: 0,
      lastUpdated: new Date().toISOString()
    });
  }
  console.log(`    ${usageRecords.length} category records reset`);

  console.log('\n  === Reset Complete ===');
  console.log(`  Questions reset:  ${updated}`);
  console.log(`  Categories reset: ${usageRecords.length}`);
  console.log('  All usage data cleared. Ready for launch!\n');
}

reset().catch(err => {
  console.error('Reset failed:', err.message || err);
  process.exit(1);
});
