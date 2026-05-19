'use strict';

const { containsProfanity } = require('../profanity');

describe('containsProfanity — clean names', () => {
  const clean = [
    'Alice',
    'Bob Smith',
    'TriviaMaster',
    'Quiz_King',
    'Player123',
    'TheChamp',
    'FastFinger',
    'BeerPong',
    'Bassoon',       // contains "ass" but NOT as a word token
    'Classic',       // contains "ass"
    'Grasshopper',   // contains "ass"
    'PassMaster',    // contains "ass"
    'Sassy',         // starts with "ass"
    'Massage',       // contains "ass"
    'Ambassador',    // contains "ass"
    'Discount',      // contains "dick" embedded
    'Pickles',       // contains "prick" partial — but "pick" is not blocked
    'Banana',
    'Cumulus',       // "cum" is WORD_BLOCKED, but this is a whole-token test and "cumulus" != "cum"
    'Piccolo',       // "picc"
    'BookFace',
    'WickedSmart',
    'Mr_T',
    'Jo',
    'TheRealMVP',
    'NightOwl',
    'A1',
  ];

  test.each(clean)('allows "%s"', (name) => {
    const result = containsProfanity(name);
    expect(result.blocked).toBe(false);
  });
});

describe('containsProfanity — SUBSTRING_BLOCKED terms', () => {
  const blocked = [
    // Direct
    ['fuck',       'fuck'],
    ['shit',       'shit'],
    ['bitch',      'bitch'],
    ['cunt',       'cunt'],
    ['pussy',      'pussy'],
    ['cock',       'cock'],
    ['prick',      'prick'],
    ['twat',       'twat'],
    ['tit',        'tit'],
    ['boob',       'boob'],
    ['penis',      'penis'],
    ['vagina',     'vagina'],
    ['whore',      'whore'],
    ['slut',       'slut'],
    ['skank',      'skank'],
    ['bastard',    'bastard'],
    ['wanker',     'wanker'],
    ['douchebag',  'douchebag'],
    ['blowjob',    'blowjob'],
    ['asshole',    'asshole'],
    ['asshat',     'asshat'],
    ['asswipe',    'asswipe'],
    ['dildo',      'dildo'],
    ['porn',       'porn'],
    ['jizz',       'jizz'],
    ['jackass',    'jackass'],
    ['nigger',     'nigger'],
    ['nigga',      'nigga'],
    ['chink',      'chink'],
    ['spick',      'spick'],
    ['kike',       'kike'],
    ['wetback',    'wetback'],
    ['raghead',    'raghead'],
    ['gook',       'gook'],
    ['beaner',     'beaner'],
    ['faggot',     'faggot'],
    ['tranny',     'tranny'],
    ['retard',     'retard'],
  ];

  test.each(blocked)('blocks "%s"', (name) => {
    const result = containsProfanity(name);
    expect(result.blocked).toBe(true);
  });
});

describe('containsProfanity — WORD_BLOCKED exact tokens', () => {
  const exactBlocked = [
    ['ass',  'ass'],
    ['fag',  'fag'],
    ['cum',  'cum'],
    ['dick', 'dick'],
    ['piss', 'piss'],
    ['wank', 'wank'],
  ];

  test.each(exactBlocked)('blocks exact word "%s"', (name) => {
    expect(containsProfanity(name).blocked).toBe(true);
  });

  test('blocks "Big Ass" (ass as token)', () => {
    expect(containsProfanity('Big Ass').blocked).toBe(true);
  });

  test('blocks "Dick Smith" (dick as token)', () => {
    expect(containsProfanity('Dick Smith').blocked).toBe(true);
  });

  test('blocks "Cum Master" (cum as token)', () => {
    expect(containsProfanity('Cum Master').blocked).toBe(true);
  });
});

describe('containsProfanity — l33tspeak / digit substitution', () => {
  test('blocks "fvck" — no, f+u+c+k with 0=o is f+u+c+k still', () => {
    // "fvck" doesn't map to "fuck" since v doesn't map; should be allowed
    expect(containsProfanity('fvck').blocked).toBe(false);
  });

  test('blocks "sh1t" (1→i → "shit")', () => {
    expect(containsProfanity('sh1t').blocked).toBe(true);
  });

  test('blocks "f4ggot" (4→a → "faggot")', () => {
    expect(containsProfanity('f4ggot').blocked).toBe(true);
  });

  test('blocks "4sshole" (4→a → "asshole")', () => {
    expect(containsProfanity('4sshole').blocked).toBe(true);
  });

  test('blocks "p0rn" (0→o → "porn")', () => {
    expect(containsProfanity('p0rn').blocked).toBe(true);
  });

  test('blocks "b1tch" (1→i → "bitch")', () => {
    expect(containsProfanity('b1tch').blocked).toBe(true);
  });

  test('blocks "5hit" (5→s → "shit")', () => {
    expect(containsProfanity('5hit').blocked).toBe(true);
  });

  test('blocks "cu7" — no, "cu7"→"cut" which is not blocked', () => {
    expect(containsProfanity('cu7').blocked).toBe(false);
  });
});

describe('containsProfanity — embedded in longer names', () => {
  test('blocks "TriviaFucker" (contains "fuck")', () => {
    expect(containsProfanity('TriviaFucker').blocked).toBe(true);
  });

  test('blocks "CockRoach" (contains "cock")', () => {
    expect(containsProfanity('CockRoach').blocked).toBe(true);
  });

  test('blocks "SuperBitch2024" (contains "bitch")', () => {
    expect(containsProfanity('SuperBitch2024').blocked).toBe(true);
  });

  test('blocks "MrRetard" (contains "retard")', () => {
    expect(containsProfanity('MrRetard').blocked).toBe(true);
  });

  test('allows "Scintillating" (contains no blocked substrings)', () => {
    expect(containsProfanity('Scintillating').blocked).toBe(false);
  });
});

describe('containsProfanity — edge cases', () => {
  test('empty string → clean', () => {
    expect(containsProfanity('').blocked).toBe(false);
  });

  test('single letter → clean', () => {
    expect(containsProfanity('A').blocked).toBe(false);
  });

  test('all spaces → clean', () => {
    expect(containsProfanity('   ').blocked).toBe(false);
  });

  test('returns matched word on block', () => {
    const result = containsProfanity('fucker');
    expect(result.blocked).toBe(true);
    expect(result.matched).toBe('fuck');
  });

  test('returns { blocked: false } with no matched field on clean name', () => {
    const result = containsProfanity('Alice');
    expect(result.blocked).toBe(false);
    expect(result.matched).toBeUndefined();
  });

  test('case insensitive — "FUCK" is blocked', () => {
    expect(containsProfanity('FUCK').blocked).toBe(true);
  });

  test('case insensitive — "Shit" is blocked', () => {
    expect(containsProfanity('Shit').blocked).toBe(true);
  });

  test('mixed case embedded — "SHiT" is blocked', () => {
    expect(containsProfanity('SHiT').blocked).toBe(true);
  });
});
