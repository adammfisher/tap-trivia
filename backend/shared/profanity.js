'use strict';

// Normalize: lowercase, digit l33tspeak substitutions, strip non-letters.
// Only covers digits (0-9) since the name validator already rejects @, $, !, etc.
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}

// Checked as substrings in the fully concatenated normalized name (spaces/underscores stripped).
// Words here are long/distinctive enough to avoid false positives in typical player names.
const SUBSTRING_BLOCKED = [
  // Profanity
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'cock', 'prick', 'twat',
  'tit', 'boob', 'penis', 'vagina', 'whore', 'slut', 'skank', 'bastard',
  'wanker', 'douchebag', 'blowjob', 'handjob', 'masturbat', 'cocksucker',
  'motherfuck', 'scumbag', 'dildo', 'porn', 'jizz', 'jackass',
  'asshole', 'asshat', 'asswipe', 'assclown', 'dumbass', 'smartass',
  // Racial slurs
  'nigger', 'nigga', 'chink', 'spick', 'kike', 'wetback', 'raghead', 'gook', 'beaner',
  // Other slurs
  'faggot', 'tranny', 'retard',
];

// Checked as exact whole-word token matches (split by space/underscore).
// Short words that would cause false positives in common names if checked as substrings
// (e.g. "bass", "class", "grasshopper" all contain "ass").
const WORD_BLOCKED = [
  'ass', 'fag', 'cum', 'dick', 'piss', 'wank',
];

/**
 * Returns { blocked: true, matched: string } if the name contains profanity,
 * or { blocked: false } if clean.
 */
function containsProfanity(name) {
  const stripped = normalize(name);

  for (const word of SUBSTRING_BLOCKED) {
    if (stripped.includes(normalize(word))) {
      return { blocked: true, matched: word };
    }
  }

  const tokens = name.toLowerCase().split(/[\s_]+/);
  for (const token of tokens) {
    const normToken = normalize(token);
    for (const word of WORD_BLOCKED) {
      if (normToken === normalize(word)) {
        return { blocked: true, matched: word };
      }
    }
  }

  return { blocked: false };
}

module.exports = { containsProfanity };
