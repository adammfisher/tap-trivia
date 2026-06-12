#!/usr/bin/env node
/**
 * Find duplicate / redundant questions in the bank.
 *
 * The duplicate signature we care about (e.g. the Archaeopteryx "Teeth" cluster):
 *   same normalized ANSWER + same rare ENTITY token in the question,
 *   even when topic_leaf / category differ.
 *
 * Two detection passes, merged with union-find into clusters:
 *   A) Exact-question duplicates  — identical normalized question text.
 *   B) Same-answer + shared rare-entity — normalizedAnswer|rarestContentToken.
 *
 * Output: a reviewable report (JSON + console summary). Picks a "keep" per
 * cluster (lowest id by default) and lists the rest as retire candidates.
 * NOTHING is deleted here — this only produces the candidate list.
 *
 * Usage:
 *   node scripts/find-duplicate-questions.js
 *   node scripts/find-duplicate-questions.js --rare-df 500 --min-cluster 2
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const SRC = getArg('--source', path.resolve(__dirname, '../Questions/questions_export.json'));
const RARE_DF_MAX = parseInt(getArg('--rare-df', '500'), 10); // token rarer than this = candidate entity
const MIN_CLUSTER = parseInt(getArg('--min-cluster', '2'), 10);
const OUT = getArg('--out', path.resolve(__dirname, 'dedup-backups', 'duplicate-clusters.json'));

const STOP = new Set((
  'about above after again against your yours yourself their there these those ' +
  'which while would could should these their being been have has had does did ' +
  'what when where whom whose will with within without into onto from that this ' +
  'than then they them were was are the and for not but you our out off over very ' +
  'most more some such only same other each both any all can how who why its his ' +
  'her she him they it is in on at to of a an as be by or if we us do my me'
).split(/\s+/));

const normText = s => (s || '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const contentTokens = q => {
  const seen = new Set();
  for (const w of normText(q).split(' ')) {
    if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) seen.add(w);
  }
  return [...seen];
};

console.log(`Loading ${SRC} ...`);
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const all = Array.isArray(raw) ? raw : (raw.questions || Object.values(raw).find(Array.isArray));
console.log(`Loaded ${all.length} questions.\n`);

// ---- Document frequency over content tokens ----
const df = new Map();
const tokensById = new Map();
for (const q of all) {
  const toks = contentTokens(q.question);
  tokensById.set(q.id, toks);
  for (const t of toks) df.set(t, (df.get(t) || 0) + 1);
}

// ---- Union-Find ----
const parent = new Map();
const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
for (const q of all) parent.set(q.id, q.id);

// ---- Pass A: exact normalized-question duplicates ----
const byQ = new Map();
for (const q of all) {
  const k = normText(q.question);
  if (!k) continue;
  if (!byQ.has(k)) byQ.set(k, []);
  byQ.get(k).push(q.id);
}
let exactPairs = 0;
for (const ids of byQ.values()) {
  if (ids.length < 2) continue;
  for (let i = 1; i < ids.length; i++) { union(ids[0], ids[i]); exactPairs++; }
}

// ---- Pass B: same-answer + rarest content token ----
const byAnsEntity = new Map();
for (const q of all) {
  const ans = normText(q.answer);
  if (!ans) continue;
  const toks = tokensById.get(q.id);
  // rarest token below the rare-DF threshold = best "entity" signal
  let best = null, bestDf = Infinity;
  for (const t of toks) {
    const d = df.get(t);
    if (d <= RARE_DF_MAX && d < bestDf) { bestDf = d; best = t; }
  }
  if (!best) continue;
  const key = ans + '|' + best;
  if (!byAnsEntity.has(key)) byAnsEntity.set(key, []);
  byAnsEntity.get(key).push(q.id);
}
for (const ids of byAnsEntity.values()) {
  if (ids.length < 2) continue;
  for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
}

// ---- Assemble clusters ----
const clusters = new Map();
for (const q of all) {
  const r = find(q.id);
  if (!clusters.has(r)) clusters.set(r, []);
  clusters.get(r).push(q);
}

const jaccard = (a, b) => {
  const A = new Set(tokensById.get(a)), B = new Set(tokensById.get(b));
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni ? inter / uni : 0;
};

const report = [];
for (const members of clusters.values()) {
  if (members.length < MIN_CLUSTER) continue;
  members.sort((a, b) => a.id - b.id);
  // confidence: exact-question text match anywhere => exact; else avg pairwise jaccard
  const qset = new Set(members.map(m => normText(m.question)));
  let confidence;
  if (qset.size < members.length) confidence = 'exact';
  else {
    let sum = 0, n = 0;
    for (let i = 0; i < members.length; i++)
      for (let j = i + 1; j < members.length; j++) { sum += jaccard(members[i].id, members[j].id); n++; }
    const avg = n ? sum / n : 0;
    confidence = avg >= 0.5 ? 'high' : avg >= 0.3 ? 'medium' : 'low';
  }
  report.push({
    confidence,
    answer: members[0].answer,
    size: members.length,
    keep: members[0].id, // placeholder: reconcile with usageCount at delete time
    retire: members.slice(1).map(m => m.id),
    members: members.map(m => ({
      id: m.id, question: m.question, answer: m.answer,
      category: m.category, topic_leaf: m.topic_leaf, difficulty: m.difficulty,
    })),
  });
}

// order: exact, high, medium, low; then by size desc
const rank = { exact: 0, high: 1, medium: 2, low: 3 };
report.sort((a, b) => (rank[a.confidence] - rank[b.confidence]) || (b.size - a.size));

const totals = { exact: 0, high: 0, medium: 0, low: 0 };
let redundant = 0;
for (const c of report) { totals[c.confidence]++; redundant += c.size - 1; }

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedFrom: SRC, totalQuestions: all.length, rareDfMax: RARE_DF_MAX,
  clusterCount: report.length, redundantQuestions: redundant, byConfidence: totals,
  clusters: report,
}, null, 2));

console.log('================ DUPLICATE SCAN ================');
console.log(`Clusters found:        ${report.length}`);
console.log(`  exact  (identical Q): ${totals.exact}`);
console.log(`  high   (jaccard>=.5): ${totals.high}`);
console.log(`  medium (jaccard>=.3): ${totals.medium}`);
console.log(`  low    (jaccard<.3) : ${totals.low}`);
console.log(`Redundant questions (sum of size-1): ${redundant}`);
console.log(`Report written: ${OUT}`);

// show the Archaeopteryx/teeth cluster + a few samples per tier
const show = c => {
  console.log(`\n  [${c.confidence}] answer="${c.answer}"  size=${c.size}  keep=${c.keep} retire=[${c.retire.join(',')}]`);
  for (const m of c.members) console.log(`     #${m.id} (${m.category} / d${m.difficulty}): ${m.question}`);
};
console.log('\n================ ARCHAEOPTERYX CHECK ================');
report.filter(c => c.members.some(m => /archaeopteryx/i.test(m.question))).forEach(show);

console.log('\n================ SAMPLE CLUSTERS ================');
for (const tier of ['exact', 'high', 'medium']) {
  const sample = report.filter(c => c.confidence === tier).slice(0, 3);
  if (sample.length) { console.log(`\n--- ${tier} ---`); sample.forEach(show); }
}
