# Tap Trivia — 03: Game Logic

---

## QUESTION TIMING PER QUESTION (60 seconds total)

```
0s     5s  7s       15s       30s       45s  50s  60s
|──────|──|─────────|─────────|─────────|────|────|
 CAT     R  DECAY     HINT 1    HINT 2   REV  SCORES
 SPLASH  E  1000→500  500→250   250→0
         A
         D
```

| Offset | Phase | Duration | What Happens |
|--------|-------|----------|--------------|
| 0–5s | `category_splash` | 5s | Category + question number + "Get Ready!" |
| 5–7s | `read_time` | 2s | Question + 4 answers visible. **Points frozen at 1000.** Players read before decay starts. |
| 7–15s | `all_answers` | 8s | Points decaying FAST (1000→500). All 4 answers still visible. |
| 15–30s | `hint_1` | 15s | 1st wrong answer: "NOT {answer}" struck through on **both player app and TV**. Points 500→250. |
| 30–45s | `hint_2` | 15s | 2nd wrong answer: "NOT {answer}" struck through on **both player app and TV**. Points 250→0. |
| 45–50s | `reveal` | 5s | Correct answer highlighted green on **both player app and TV**. 0 points. |
| 50–60s | `scores` | 10s | Bar leaderboard. Transition to next question. |

**Answer window:** 5s to 50s (45 seconds). One submission per question.
**Read time:** 5s to 7s — answers are visible and tappable, but points are frozen at 1000. No penalty for reading.

---

## SCORING ENGINE

### 1000 Points Per Question — 2-Second Read Time + Front-Weighted Exponential Decay

The first 2 seconds after answers appear (5s–7s) are a **free read window** — answering here gets full 1000 points. After 7s, points decay using front-weighted exponential curves (k=3.0).

```javascript
const READ_TIME_END_MS = 7000;  // Read time ends at 7s (5s start + 2s read)
const ANSWER_START_MS = 5000;   // Answers first visible
const ANSWER_END_MS = 50000;    // Answer window closes

function calculatePoints(elapsedMs) {
  // elapsedMs = time since question start (0s mark)
  
  // Before answers visible or after window closes
  if (elapsedMs < ANSWER_START_MS || elapsedMs > ANSWER_END_MS) return 0;
  
  // READ TIME: 5s–7s → full 1000 points
  if (elapsedMs <= READ_TIME_END_MS) return 1000;
  
  // After read time: decay from 7s onward
  const decayElapsed = elapsedMs - READ_TIME_END_MS; // ms since decay started
  const k = 3.0;
  
  if (decayElapsed <= 8000) {
    // TIER 1: 7s–15s (8 seconds of decay). 1000 → 500.
    const t = decayElapsed / 8000;
    return Math.round(500 + 500 * Math.exp(-k * t));
  }
  
  if (decayElapsed <= 23000) {
    // TIER 2: 15s–30s (15 seconds). 500 → 250.
    const t = (decayElapsed - 8000) / 15000;
    return Math.round(250 + 250 * Math.exp(-k * t));
  }
  
  if (decayElapsed <= 38000) {
    // TIER 3: 30s–45s (15 seconds). 250 → 0.
    const t = (decayElapsed - 23000) / 15000;
    return Math.round(250 * Math.exp(-k * t));
  }
  
  return 0; // 45s–50s: answer revealed, 0 points
}
```

### Curve Examples

**Read Time (5–7s): 1000 points flat**
| Time | Points | Note |
|------|--------|------|
| 5.0s | 1000 | Answers appear |
| 6.0s | 1000 | Still reading — no penalty |
| 6.9s | 1000 | Last moment of free window |

**Tier 1 (7–15s, 1000→500):**
| Time | Points | Note |
|------|--------|------|
| 7.0s | 1000 | Decay starts NOW |
| 8.0s | 845 | Lost 155 in 1 second! |
| 9.0s | 720 | |
| 11.0s | 540 | |
| 15.0s | 500 | Floor — hint 1 drops |

**Tier 2 (15–30s, 500→250):**
| Time | Points |
|------|--------|
| 15.0s | 500 |
| 17.0s | 408 |
| 22.0s | 300 |
| 30.0s | 250 |

**Tier 3 (30–45s, 250→0):**
| Time | Points |
|------|--------|
| 30.0s | 250 |
| 33.0s | 135 |
| 38.0s | 33 |
| 45.0s | 0 |

**Wrong answer at any time = 0 points.**

### Points Display
- **Player app + TV during read time (5–7s):** Shows "1000" frozen, no animation. Subtle "READ" label on player app.
- **Player app + TV at 7s:** Counter starts animating downward.
- **After answering on player app:** "Correct! +1000" (if during read time) or "Correct! +845" etc.

---

## GAME CLOCK MODULE (`game-clock.js`)

Shared across backend, player app, and TV app. SINGLE SOURCE OF TRUTH. Copy this file identically to all three locations.

```javascript
const QUESTION_DURATION_MS = 60000;
const PHASES = {
  CATEGORY_SPLASH:  { start: 0,     end: 5000  },
  READ_TIME:        { start: 5000,  end: 7000  },
  ALL_ANSWERS:      { start: 7000,  end: 15000 },
  HINT_1:           { start: 15000, end: 30000 },
  HINT_2:           { start: 30000, end: 45000 },
  REVEAL:           { start: 45000, end: 50000 },
  SCORES:           { start: 50000, end: 60000 }
};

function getGameState(gameStartEpoch, nowEpoch) {
  const elapsed = nowEpoch - gameStartEpoch;
  
  if (elapsed < 0) {
    return { gamePhase: 'pre_game', secondsUntilStart: Math.ceil(-elapsed / 1000) };
  }
  
  const totalGameMs = 15 * QUESTION_DURATION_MS;
  if (elapsed >= totalGameMs) {
    return { gamePhase: 'post_game' };
  }
  
  const questionNumber = Math.floor(elapsed / QUESTION_DURATION_MS) + 1;
  const elapsedInQuestion = elapsed % QUESTION_DURATION_MS;
  
  let questionPhase = 'scores';
  for (const [phase, range] of Object.entries(PHASES)) {
    if (elapsedInQuestion >= range.start && elapsedInQuestion < range.end) {
      questionPhase = phase.toLowerCase();
      break;
    }
  }
  
  const canAnswer = elapsedInQuestion >= 5000 && elapsedInQuestion < 50000;
  
  // Which hints are visible right now
  const hintsVisible = [];
  if (elapsedInQuestion >= 15000) hintsVisible.push(0); // First elimination
  if (elapsedInQuestion >= 30000) hintsVisible.push(1); // Second elimination
  
  // Is the correct answer revealed
  const correctRevealed = elapsedInQuestion >= 45000 && elapsedInQuestion < 50000;
  
  return {
    gamePhase: 'active',
    questionNumber,
    questionPhase,
    elapsedInQuestion,
    canAnswer,
    pointsAvailable: canAnswer ? calculatePoints(elapsedInQuestion) : 0,
    hintsVisible,
    correctRevealed,
    questionSecondsRemaining: Math.max(0, Math.ceil((50000 - elapsedInQuestion) / 1000))
  };
}
```

**`hintsVisible`**: Both player app and TV use this + `eliminateOrder` from the question data to determine which answers to cross out at any moment.

---

## PLAYER APP HINT DISPLAY LOGIC

The player app receives `eliminateOrder` from `get-question` and uses `game-clock.js` to drive CSS animations:

```javascript
// In question screen update loop (requestAnimationFrame or setInterval)
const { hintsVisible, correctRevealed } = getGameState(gameStartEpoch, Date.now());
const { eliminateOrder, answers } = questionData;

// Determine which answers are currently eliminated
const eliminatedIndices = hintsVisible.map(h => eliminateOrder[h]);

// For each answer button, determine its state:
answers.forEach((answer, index) => {
  const el = document.getElementById(`answer-${index}`);
  if (eliminatedIndices.includes(index)) {
    // Add CSS class: "NOT {answer}", strikethrough, faded
    el.classList.add('eliminated');
    el.textContent = `NOT ${answer}`;
    el.disabled = true;
  } else if (correctRevealed && answer === correctAnswer) {
    // Add CSS class: highlighted green
    el.classList.add('correct-reveal');
  } else {
    // Normal, tappable (if canAnswer and not already answered)
  }
});
```

**CSS animations (identical visual effect on player app and TV):**
- At 15s: answer at `eliminateOrder[0]` gets `.eliminated` class → slides left via `transform`, strikethrough via `text-decoration`, text changes to "NOT {answer}", fades to 40% opacity. 400ms ease-out CSS transition.
- At 30s: answer at `eliminateOrder[1]` same treatment.
- At 45s: correct answer gets `.correct-reveal` class → glows green, remaining wrong answer gets strikethrough.
- Remaining answers stay bright and clickable until player answers or window closes.

---

## BAR CODE GENERATION

```javascript
function generateBarCode() {
  // 5-char alphanumeric, excluding ambiguous: 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // e.g., "K7M2X"
}
```

- 30^5 = **24,300,000** possible codes — effectively unlimited
- Collision check via DynamoDB conditional write (`attribute_not_exists(PK)`)
- If collision, regenerate and retry (max 5 attempts)
- **Codes are permanent** — no TTL, no expiration
- TV app stores barCode in localStorage
- On TV app reopen: read from localStorage → call `GET /bar/{barCode}` to verify → resume
- Bar owner can reset code via TV settings → calls `POST /bar/{barCode}/reset`

---

## QUESTION SELECTION ALGORITHM

Runs in `generate-games` Lambda. Daily, builds 40 games.

### Difficulty Ramp Per Game (15 questions)

```
Questions 1–4:   Difficulty 1  (4 questions)
Questions 5–9:   Difficulty 2  (5 questions)
Questions 10–12: Difficulty 3  (3 questions)
Questions 13–14: Difficulty 4  (2 questions)
Question 15:     Difficulty 5  (1 question — "killer closer")
```

### Question Bank Targets (108,000 total at production scale)

**Phase 1 testing uses 100 seed questions from `trivia_questions.json` in the project root.** The selection algorithm must handle small question pools gracefully — when a category/difficulty combo has no available questions, widen difficulty ±1 or pick from any available category at that difficulty.

| Level | Qs/Game | % of 15 | Bank Target | 6-Month Demand | Cycles |
|-------|---------|---------|-------------|----------------|--------|
| L1    | 4       | 26.7%   | 27% (28,800)| 28,800         | 1.0    |
| L2    | 5       | 33.3%   | 33% (36,000)| 36,000         | 1.0    |
| L3    | 3       | 20.0%   | 20% (21,600)| 21,600         | 1.0    |
| L4    | 2       | 13.3%   | 13% (14,400)| 14,400         | 1.0    |
| L5    | 1       | 6.7%    | 7% (7,200)  | 7,200          | 1.0    |

Bank distribution matches ramp demand exactly. No level exhausts before 6 months. The question generator must target these ratios.

### Category Rules

- 15 questions from **at least 8 different categories**
- No more than 2 questions from any single category per game
- Spread across the 6 super-categories (Geography, Entertainment, History, Art & Culture, Science & Nature, Sports & Leisure) — at least 1 from each per game
- Across 40 nightly games, rotate so all 60 categories get airtime weekly

### No-Repeat Algorithm

```
For each question slot:
  1. Determine difficulty (by position in the ramp)
  2. Pick category (respecting distribution rules)
  3. Query Questions table by category + difficulty
  4. Query QuestionUsage for this category
  5. Filter out usedQuestionIds
  6. Pick randomly from remaining
  7. If none remain at this difficulty:
     a. If ALL category questions used → clear set, increment cycle, pick fresh
     b. Otherwise → widen difficulty ±1 within same category
  8. Add to usedQuestionIds set
```

### Elimination Order

For each question:
1. Question has 3 wrong answers
2. Randomly pick 2 of 3 to eliminate
3. First → eliminated at 15s ("NOT X"), Second → at 30s ("NOT Y")
4. Third wrong answer stays visible until correct revealed at 45s
5. Store as `eliminateOrder: [idx1, idx2]` — indices into `wrongAnswers` array

---

## NIGHTLY GENERATION FLOW

**Trigger:** EventBridge → 4:00 PM ET daily

1. Calculate 40 timeslots (5:00 PM ET → 2:45 AM ET, every 15 min)
2. For each game: generate UUID, select 15 questions per the ramp, assign elimination orders
3. Batch write 40 games to Games table
4. Update QuestionUsage for all categories drawn from
5. Log: total questions used, categories hit, remaining per category per level

---

## ANTI-CHEAT

1. **One question at a time** — API returns 403 before question is available
2. **Server-side timestamps** — scoring uses `serverTimestamp - questionStartEpoch`
3. **One answer per question** — DynamoDB conditional write rejects duplicates
4. **No correct answer in question payload** — only revealed on submit-answer response or after reveal phase
5. **Deterministic shuffle** — answer positions seeded by `gameId + questionNumber`
6. **eliminateOrder is NOT a cheat vector** — it identifies which 2 of 3 *wrong* answers get eliminated. After both eliminations, the player still faces 50/50: correct answer vs. the third wrong answer. No advantage from knowing early.
7. **Global leaderboard locked during game** — no scouting
