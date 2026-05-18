#!/usr/bin/env node
'use strict';

/**
 * Tap Trivia — Delete Future Pre-Generated Games
 *
 * Scans TapTrivia-Games and deletes all records with startTimeEpoch > now.
 * Historical game records (past games + their answers) are left intact.
 *
 * Usage:
 *   node scripts/reset-games.js              (with confirmation prompt)
 *   node scripts/reset-games.js --confirm     (skip prompt)
 *   node scripts/reset-games.js --local       (DynamoDB Local)
 */

const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const skipPrompt = args.includes('--confirm');

if (isLocal) {
  process.env.DYNAMODB_LOCAL = 'true';
}

const { docClient, TABLE, scan, DeleteCommand } = require(
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

async function batchDelete(tableName, keys) {
  const { BatchWriteCommand } = require(path.resolve(__dirname, '../backend/shared/dynamo'));
  const chunks = [];
  for (let i = 0; i < keys.length; i += 25) {
    chunks.push(keys.slice(i, i + 25));
  }
  for (const chunk of chunks) {
    let requests = chunk.map(key => ({ DeleteRequest: { Key: key } }));
    let retries = 0;
    while (requests.length > 0 && retries < 5) {
      const res = await docClient.send(new BatchWriteCommand({
        RequestItems: { [tableName]: requests }
      }));
      const unprocessed = res.UnprocessedItems && res.UnprocessedItems[tableName];
      if (!unprocessed || unprocessed.length === 0) break;
      requests = unprocessed;
      retries++;
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, retries)));
    }
  }
}

async function run() {
  console.log('\n  Tap Trivia — Delete Future Pre-Generated Games\n');
  console.log(`  Mode: ${isLocal ? 'DynamoDB Local' : 'AWS Production'}\n`);

  const nowEpoch = Date.now();
  console.log(`  Scanning TapTrivia-Games for records with startTimeEpoch > ${nowEpoch}...`);

  const allGames = await scan(TABLE.GAMES, {
    ProjectionExpression: 'PK, startTimeEpoch'
  });

  const futureGames = allGames.filter(g => (g.startTimeEpoch || 0) > nowEpoch);
  const pastGames = allGames.length - futureGames.length;

  console.log(`  Total game records:   ${allGames.length}`);
  console.log(`  Past games (kept):    ${pastGames}`);
  console.log(`  Future games (delete): ${futureGames.length}\n`);

  if (futureGames.length === 0) {
    console.log('  Nothing to delete. No future games found.\n');
    return;
  }

  const ok = await confirm(`  Delete ${futureGames.length} future game records? [y/N] `);
  if (!ok) {
    console.log('\n  Aborted.\n');
    return;
  }

  console.log(`\n  Deleting ${futureGames.length} future game records...`);
  const keys = futureGames.map(g => ({ PK: g.PK }));
  const chunkSize = 500;
  let deleted = 0;

  for (let i = 0; i < keys.length; i += chunkSize) {
    await batchDelete(TABLE.GAMES, keys.slice(i, i + chunkSize));
    deleted += Math.min(chunkSize, keys.length - i);
    console.log(`    ${deleted}/${keys.length} deleted`);
  }

  console.log('\n  === Reset Complete ===');
  console.log(`  Future games deleted: ${deleted}`);
  console.log('  Run generate-games Lambda to pre-generate fresh games.\n');
}

run().catch(err => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
