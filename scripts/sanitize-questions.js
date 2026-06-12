#!/usr/bin/env node
/**
 * Question-bank sanitizer for Questions/questions.json
 * (schema: id, question, answer, wrong_answers[3], category, difficulty).
 *
 * Non-destructive by default: reports problems, tiered by severity, and writes
 * each issue's flagged records to scripts/sanitize-out/<check>.json for review.
 *
 *   node scripts/sanitize-questions.js              # report only
 *   node scripts/sanitize-questions.js --fix        # also apply SAFE auto-fixes
 *                                                   #   (trim/collapse whitespace),
 *                                                   #   backs up original first
 *
 * Two normalizers, used deliberately:
 *   nz  = lowercase + collapse whitespace + trim  (SYMBOL-PRESERVING) — so "+",
 *         "=", "x", "÷" stay distinct. Used for answer/option equality.
 *   alnum = lowercase, strip to [a-z0-9 ]          — used for question-text dedup
 *         and answer-leak word matching.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'Questions/questions.json');
const OUTDIR = path.join(ROOT, 'scripts/sanitize-out');

const nz = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
const alnum = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// check key -> {severity, desc, hits:[]}
const checks = {};
const def = (key, severity, desc) => (checks[key] = { severity, desc, hits: [] });
const hit = (key, q, extra) => checks[key].hits.push(extra ? { id: q.id, question: q.question, answer: q.answer, wrong_answers: q.wrong_answers, ...extra } : q);

def('dup_id',            'CRITICAL', 'Duplicate question id');
def('empty_question',    'CRITICAL', 'Empty/blank question');
def('empty_answer',      'CRITICAL', 'Empty/blank answer');
def('bad_options',       'CRITICAL', 'wrong_answers not exactly 3 non-empty strings');
def('answer_is_option',  'CRITICAL', 'Correct answer also appears in wrong_answers (two correct options)');
def('duplicate_options', 'CRITICAL', 'Two wrong_answers are identical');
def('exact_dup_question','HIGH',     'Identical question text on >1 id, same answer (residual duplicate)');
def('contradiction',     'HIGH',     'Identical question text on >1 id with DIFFERENT answers');
def('answer_leak',       'HIGH',     'Answer phrase appears verbatim in the question');
def('ai_artifact',       'MEDIUM',   'LLM/template boilerplate leaked into text');
def('whitespace',        'MEDIUM',   'Leading/trailing or doubled whitespace (auto-fixable)');
def('placeholder',       'MEDIUM',   'Placeholder/template markers (TODO, {{ }}, [insert], lorem)');
def('no_qmark',          'INFO',     'Question does not end with "?"');
def('length',            'INFO',     'Question <10 or >320 chars, or an option >120 chars');

// ---- single pass ----
const idSeen = new Set();
// strict: genuine LLM boilerplate that should never appear in a finished Q/A,
// not legit trivia that merely quotes phrases like "I'm sorry" or "I cannot tell a lie"
const AI_RE = /(\bas an ai\b|\bas a language model\b|i'?m sorry,? but\b|i cannot (assist|help you|fulfill|provide)|\bi'?m unable to\b|```|^\s*(question|answer)\s*:\s)/i;
// strict: real template markers, word-bounded (avoids masTODOn / GlypTODOn / XXXXX-as-answer)
const PH_RE = /(\{\{|\}\}|\[insert\b|\blorem ipsum\b|\bplaceholder\b|\bTODO\b)/;
const EITHER_OR = /\b(\w+)\s+or\s+(\w+)\s*\?*\s*$/i; // "...high or low?" — answer-in-question is legitimate here

for (const q of all) {
  // structural
  if (idSeen.has(q.id)) hit('dup_id', q, { dupOf: q.id }); else idSeen.add(q.id);
  if (!String(q.question || '').trim()) hit('empty_question', q, {});
  if (!String(q.answer || '').trim()) hit('empty_answer', q, {});

  const wa = Array.isArray(q.wrong_answers) ? q.wrong_answers : null;
  if (!wa || wa.length !== 3 || wa.some(w => !String(w == null ? '' : w).trim())) hit('bad_options', q, {});

  const aN = nz(q.answer);
  const waN = (wa || []).map(nz);
  if (aN && waN.includes(aN)) hit('answer_is_option', q, {});
  if (waN.length === 3 && new Set(waN).size !== waN.length) hit('duplicate_options', q, {});

  // answer leak (symbol-preserving alnum, word-bounded, answer must carry a real word)
  const aAl = alnum(q.answer);
  const qAl = alnum(q.question);
  if (aAl.length >= 4 && /[a-z]/.test(aAl) && (' ' + qAl + ' ').includes(' ' + aAl + ' ') && !EITHER_OR.test(String(q.question || '')))
    hit('answer_leak', q, {});

  // hygiene
  const fields = [q.question, q.answer, ...(wa || [])].map(String);
  // boilerplate/template markers only matter in the answer or options — a QUESTION
  // can legitimately be ABOUT "placeholders" or "AI", so don't scan question text.
  const answerFields = [q.answer, ...(wa || [])].map(String);
  if (answerFields.some(f => AI_RE.test(f))) hit('ai_artifact', q, {});
  if (fields.some(f => f !== f.trim() || /\s{2,}/.test(f))) hit('whitespace', q, {});
  if (answerFields.some(f => PH_RE.test(f))) hit('placeholder', q, {});

  // info
  if (!/\?\s*$/.test(String(q.question || ''))) hit('no_qmark', q, {});
  const qlen = String(q.question || '').length;
  if (qlen < 10 || qlen > 320 || (wa || []).some(w => String(w).length > 120) || String(q.answer).length > 120)
    hit('length', q, { qlen });
}

// ---- duplicate question text (post-dedup residual) ----
const byNormQ = new Map();
for (const q of all) { const k = alnum(q.question); if (!k) continue; (byNormQ.get(k) || byNormQ.set(k, []).get(k)).push(q); }
for (const group of byNormQ.values()) {
  if (group.length < 2) continue;
  const answers = new Set(group.map(g => nz(g.answer)));
  const target = answers.size > 1 ? 'contradiction' : 'exact_dup_question';
  for (const q of group) hit(target, q, { ids: group.map(g => g.id), answers: [...answers] });
}

// ---- write outputs ----
fs.mkdirSync(OUTDIR, { recursive: true });
const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];
const rows = Object.entries(checks).sort((a, b) => order.indexOf(a[1].severity) - order.indexOf(b[1].severity) || b[1].hits.length - a[1].hits.length);

console.log(`\nSanitizing ${all.length} questions from Questions/questions.json\n`);
console.log('SEVERITY  COUNT   CHECK                 DESCRIPTION');
console.log('────────  ─────   ───────────────────   ───────────────────────────────────────');
let totalFlagged = 0;
for (const [key, c] of rows) {
  if (c.hits.length) { fs.writeFileSync(path.join(OUTDIR, key + '.json'), JSON.stringify(c.hits, null, 2)); totalFlagged += c.hits.length; }
  console.log(
    c.severity.padEnd(8),
    String(c.hits.length).padStart(6), '  ',
    key.padEnd(20), c.desc
  );
}
console.log(`\nFlagged records written to scripts/sanitize-out/<check>.json`);

// ---- optional safe auto-fix: whitespace only ----
if (FIX) {
  const stamp = '2026-06-04-sanitize';
  const backup = SRC.replace(/\.json$/, `.before-${stamp}.json`);
  if (!fs.existsSync(backup)) fs.copyFileSync(SRC, backup);
  let fixed = 0;
  for (const q of all) {
    const before = JSON.stringify([q.question, q.answer, q.wrong_answers]);
    q.question = String(q.question).replace(/\s+/g, ' ').trim();
    q.answer = String(q.answer).replace(/\s+/g, ' ').trim();
    if (Array.isArray(q.wrong_answers)) q.wrong_answers = q.wrong_answers.map(w => String(w).replace(/\s+/g, ' ').trim());
    if (JSON.stringify([q.question, q.answer, q.wrong_answers]) !== before) fixed++;
  }
  fs.writeFileSync(SRC, JSON.stringify(all, null, 2));
  console.log(`\n--fix: normalized whitespace on ${fixed} records. Backup: ${path.basename(backup)}`);
}
