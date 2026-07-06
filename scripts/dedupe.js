#!/usr/bin/env node
/**
 * Question-bank deduper for Questions/questions.json (flat schema:
 * id, question, answer, wrong_answers, category, difficulty).
 *
 * Duplicate signal: same normalized ANSWER + a shared rare ENTITY token in the
 * question (catches reworded dups across categories), plus exact-question text.
 * Clusters are built with union-find; each non-keeper member is classified by
 * its MAX pairwise wording-similarity (jaccard) to any sibling:
 *   exact  : identical normalized question text to a sibling
 *   high   : jaccard >= 0.5            -> safe lexical cut
 *   medium : jaccard >= 0.3            -> needs semantic review (LLM)
 *   low    : jaccard <  0.3            -> needs semantic review (LLM)
 *
 * Subcommands:
 *   analyze  -> writes phase1-removals.json, review-clusters.json, stats
 *   apply --removals f1.json[,f2.json]  -> writes deduped questions.json + backup
 *
 * Usage:
 *   node scripts/dedupe.js analyze
 *   node scripts/dedupe.js apply --removals scripts/dedup-backups/phase1-removals.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cmd = args[0];
const getArg = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const ROOT = path.resolve(__dirname, '..');
const SRC = getArg('--source', path.join(ROOT, 'Questions/questions.json'));
const OUTDIR = path.join(ROOT, 'scripts/dedup-backups');
const RARE_DF_MAX = parseInt(getArg('--rare-df', '500'), 10);

const STOP = new Set((
  'about above after again against your yours yourself their there these those ' +
  'which while would could should being been have has had does did done make made ' +
  'what when where whom whose will with within without into onto from that this ' +
  'than then they them were was are the and for not but you our out off over very ' +
  'most more some such only same other each both any all can how who why its his ' +
  'her she him they it is in on at to of a an as be by or if we us do my me name ' +
  'called known first famous following during between because also known used'
).split(/\s+/));

const normText = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const contentTokens = s => {
  const out = new Set();
  for (const w of normText(s).split(' ')) if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w);
  return out;
};

function buildClusters(all) {
  const df = new Map();
  const tok = new Map();
  for (const q of all) {
    const t = contentTokens(q.question); tok.set(q.id, t);
    for (const w of t) df.set(w, (df.get(w) || 0) + 1);
  }
  const parent = new Map();
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const q of all) parent.set(q.id, q.id);

  // Pass A: exact normalized question text
  const byQ = new Map();
  for (const q of all) { const k = normText(q.question); if (!k) continue; (byQ.get(k) || byQ.set(k, []).get(k)).push(q.id); }
  for (const ids of byQ.values()) for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);

  // Pass B: same answer + rarest content token
  const byAE = new Map();
  for (const q of all) {
    const ans = normText(q.answer); if (!ans) continue;
    let best = null, bestDf = Infinity;
    for (const w of tok.get(q.id)) { const d = df.get(w); if (d <= RARE_DF_MAX && d < bestDf) { bestDf = d; best = w; } }
    if (!best) continue;
    const k = ans + '|' + best; (byAE.get(k) || byAE.set(k, []).get(k)).push(q.id);
  }
  for (const ids of byAE.values()) for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);

  const groups = new Map();
  for (const q of all) { const r = find(q.id); (groups.get(r) || groups.set(r, []).get(r)).push(q); }

  const jac = (a, b) => { const A = tok.get(a), B = tok.get(b); let i = 0; for (const x of A) if (B.has(x)) i++; const u = A.size + B.size - i; return u ? i / u : 0; };
  return { groups: [...groups.values()].filter(g => g.length >= 2), jac };
}

function classify(all) {
  const byId = new Map(all.map(q => [q.id, q]));
  const { groups, jac } = buildClusters(all);
  const phase1 = [];          // {id, keep, tier, sim}
  const reviewClusters = [];  // {clusterId, keep:{...}, candidates:[{...,sim,tier}]}
  let cid = 0;
  for (const members of groups) {
    members.sort((a, b) => a.id - b.id);
    const keep = members[0];
    const candidates = [];
    for (let i = 1; i < members.length; i++) {
      const m = members[i];
      let maxSim = 0, exact = false;
      for (const o of members) {
        if (o.id === m.id) continue;
        if (normText(o.question) === normText(m.question)) exact = true;
        const s = jac(m.id, o.id); if (s > maxSim) maxSim = s;
      }
      const tier = exact ? 'exact' : maxSim >= 0.5 ? 'high' : maxSim >= 0.3 ? 'medium' : 'low';
      if (tier === 'exact' || tier === 'high') phase1.push({ id: m.id, keep: keep.id, tier, sim: +maxSim.toFixed(3) });
      else candidates.push({ id: m.id, question: m.question, answer: m.answer, category: m.category, sim: +maxSim.toFixed(3), tier });
    }
    if (candidates.length) {
      reviewClusters.push({
        clusterId: cid++,
        answer: keep.answer,
        keep: { id: keep.id, question: keep.question, answer: keep.answer, category: keep.category },
        candidates,
      });
    }
  }
  return { phase1, reviewClusters, byId };
}

if (cmd === 'analyze') {
  console.log(`Loading ${SRC} ...`);
  const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  console.log(`Loaded ${all.length} questions.`);
  const { phase1, reviewClusters } = classify(all);
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'phase1-removals.json'), JSON.stringify(phase1, null, 2));
  fs.writeFileSync(path.join(OUTDIR, 'review-clusters.json'), JSON.stringify(reviewClusters, null, 2));
  const tiers = phase1.reduce((a, r) => (a[r.tier] = (a[r.tier] || 0) + 1, a), {});
  const reviewMembers = reviewClusters.reduce((n, c) => n + c.candidates.length, 0);
  console.log('\n=== PHASE 1 (safe lexical cut) ===');
  console.log('  exact:', tiers.exact || 0, ' high:', tiers.high || 0, ' total cut:', phase1.length);
  console.log('=== PHASE 2 (LLM review) ===');
  console.log('  review clusters:', reviewClusters.length, ' candidate members:', reviewMembers);
  console.log('\nWrote:', path.join(OUTDIR, 'phase1-removals.json'));
  console.log('Wrote:', path.join(OUTDIR, 'review-clusters.json'));
} else if (cmd === 'apply') {
  const files = getArg('--removals', '').split(',').filter(Boolean);
  if (!files.length) { console.error('need --removals <file[,file]>'); process.exit(1); }
  const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const byId = new Map(all.map(q => [q.id, q]));
  const removeIds = new Set();
  for (const f of files) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) removeIds.add(typeof r === 'object' ? r.id : r);
  const removed = [...removeIds].map(id => byId.get(id)).filter(Boolean);
  fs.mkdirSync(OUTDIR, { recursive: true });
  const ts = getArg('--stamp', 'apply');
  const backup = path.join(OUTDIR, `removed-records-${ts}.json`);
  fs.writeFileSync(backup, JSON.stringify(removed, null, 2));
  // backup the original source once
  const origBackup = SRC.replace(/\.json$/, `.before-dedupe-${ts}.json`);
  if (!fs.existsSync(origBackup)) fs.copyFileSync(SRC, origBackup);
  const kept = all.filter(q => !removeIds.has(q.id));
  fs.writeFileSync(SRC, JSON.stringify(kept, null, 2));
  console.log(`Removed ${removed.length} questions (requested ${removeIds.size}).`);
  console.log(`Bank: ${all.length} -> ${kept.length}`);
  console.log(`Original backed up: ${origBackup}`);
  console.log(`Removed records:    ${backup}`);
} else {
  console.error('usage: node scripts/dedupe.js analyze | apply --removals <file>');
  process.exit(1);
}
