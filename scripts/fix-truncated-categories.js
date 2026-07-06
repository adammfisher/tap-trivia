#!/usr/bin/env node
'use strict';

/**
 * Fix truncated category names in the question bank.
 *
 * 67 categories were truncated at exactly 50 chars (cut mid-word), each a
 * prefix of exactly one full category name. This remaps the truncated names
 * to their full versions, both in the master file (Questions/questions.json)
 * and IN-PLACE in the live DynamoDB (UpdateItem SET category — only the
 * category field changes; usage/createdAt/etc. preserved), then fixes the
 * QuestionUsage records (bump full-category totals, delete truncated records).
 *
 * Usage:
 *   node scripts/fix-truncated-categories.js            (dry run — print remap)
 *   node scripts/fix-truncated-categories.js --apply    (write file + DynamoDB)
 */

const path = require('path');
const fs = require('fs');
const {
  TABLE, update, get, put, docClient, DeleteCommand
} = require(path.resolve(__dirname, '../backend/shared/dynamo'));

const FILE = path.resolve(__dirname, '../Questions/questions.json');
const BACKUP = path.resolve(__dirname, '../Questions/questions.before-cattrunc-2026-06-15.json');
const APPLY = process.argv.includes('--apply');

// Run `worker` over items with bounded concurrency.
async function pool(items, concurrency, worker) {
  let idx = 0, done = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
      done++;
      if (done % 2500 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  const catList = [...new Set(raw.map(q => q.category))].sort();

  // Build remap: a 50-char category that is a prefix of exactly one longer one.
  const remap = {};
  for (const c of catList) {
    if (c.length === 50) {
      const fulls = catList.filter(o => o !== c && o.startsWith(c));
      if (fulls.length === 1) remap[c] = fulls[0];
    }
  }
  // Whitespace normalization: a leading/trailing-space variant of another
  // category (e.g. "...Americana " → "...Americana") is the same bucket.
  for (const c of catList) {
    const s = c.trim();
    if (s !== c && !remap[c]) remap[c] = s;
  }
  const truncCats = Object.keys(remap);

  console.log(`\n=== Truncated category remap (${truncCats.length}) ===`);
  for (const c of truncCats) console.log(`  "${c}"\n      → "${remap[c]}"`);

  // Affected question ids (by ORIGINAL category), and apply remap in memory.
  const affectedIds = [];
  for (const q of raw) {
    if (remap[q.category]) { affectedIds.push(q.id); q.category = remap[q.category]; }
  }
  const finalCats = new Set(raw.map(q => q.category));
  console.log(`\nAffected questions: ${affectedIds.length.toLocaleString()}`);
  console.log(`Distinct categories: ${catList.length} → ${finalCats.size}`);

  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --apply to write the master file + DynamoDB.\n');
    return;
  }

  // 1. Back up (once — preserve the original) + rewrite the master file.
  if (!fs.existsSync(BACKUP)) fs.copyFileSync(FILE, BACKUP);
  fs.writeFileSync(FILE, JSON.stringify(raw, null, 2));
  console.log(`\nMaster file rewritten (backup: ${path.basename(BACKUP)})`);

  // 2. In-place DynamoDB UpdateItem: SET category on affected questions only.
  const newCatById = new Map(raw.filter(q => affectedIds.includes(q.id)).map(q => [q.id, q.category]));
  // (affectedIds is the source of truth for "which changed"; build id→newCat fast)
  const idSet = new Set(affectedIds);
  const updates = raw.filter(q => idSet.has(q.id));
  console.log(`\nUpdating ${updates.length.toLocaleString()} questions in DynamoDB (SET category)...`);
  await pool(updates, 40, async (q) => {
    await update(
      TABLE.QUESTIONS,
      { PK: `Q#${q.id}` },
      'SET #c = :c',
      { ':c': q.category },
      { '#c': 'category' }
    );
  });

  // 3. QuestionUsage: bump full-category totals, delete orphaned truncated records.
  const counts = {};
  for (const q of raw) counts[q.category] = (counts[q.category] || 0) + 1;
  const affectedFulls = [...new Set(Object.values(remap))];
  console.log(`\nUpdating ${affectedFulls.length} full-category usage records...`);
  for (const cat of affectedFulls) {
    const existing = await get(TABLE.QUESTION_USAGE, { PK: `USAGE#${cat}` });
    if (existing) {
      await put(TABLE.QUESTION_USAGE, { ...existing, totalInCategory: counts[cat], lastUpdated: new Date().toISOString() });
    } else {
      await put(TABLE.QUESTION_USAGE, { PK: `USAGE#${cat}`, usedQuestionIds: [], totalInCategory: counts[cat], cycleNumber: 0, lastUpdated: new Date().toISOString() });
    }
  }
  console.log(`Deleting ${truncCats.length} orphaned truncated usage records...`);
  for (const cat of truncCats) {
    await docClient.send(new DeleteCommand({ TableName: TABLE.QUESTION_USAGE, Key: { PK: `USAGE#${cat}` } }));
  }

  console.log('\n=== DONE ===');
  console.log(`Questions remapped: ${updates.length.toLocaleString()}`);
  console.log(`Full categories updated: ${affectedFulls.length}`);
  console.log(`Truncated usage records deleted: ${truncCats.length}`);
})().catch(err => { console.error(err); process.exit(1); });
