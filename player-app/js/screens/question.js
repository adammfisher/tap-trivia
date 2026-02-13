/**
 * Tap Trivia Player App — Question Screen
 * The core game experience. Shows questions, hints, timer, points.
 * Drives animations via requestAnimationFrame using local clock + game-clock.js.
 */

const QuestionScreen = {
  gameId: null,
  gameStartEpoch: null,
  currentQuestionNumber: null,
  questionData: null,
  answerResult: null,
  totalGameScore: 0,
  animFrame: null,
  fetchingQuestion: false,
  submitting: false,
  _lastStructuralKey: null,
  _lastStateKey: null,

  show(gameId, gameStartEpoch) {
    this.gameId = gameId;
    this.gameStartEpoch = gameStartEpoch;
    this.answerResult = null;
    this.questionData = null;
    this.currentQuestionNumber = null;
    this.totalGameScore = 0;
    this.submitting = false;
    this._lastStructuralKey = null;
    this._lastStateKey = null;
    this.startGameLoop();
  },

  hide() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  },

  startGameLoop() {
    const loop = () => {
      this.update();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  },

  async update() {
    const state = getGameState(this.gameStartEpoch, Date.now());

    if (state.gamePhase === 'post_game') {
      this.hide();
      App.showScreen('results');
      ResultsScreen.show(this.gameId, this.totalGameScore);
      return;
    }

    if (state.gamePhase !== 'active') return;

    // New question?
    if (state.questionNumber !== this.currentQuestionNumber) {
      this.currentQuestionNumber = state.questionNumber;
      this.answerResult = null;
      this.questionData = null;
      this.fetchingQuestion = false;
      this.submitting = false;
      this._lastStructuralKey = null;
      this._lastStateKey = null;
    }

    // Fetch question data if needed
    if (!this.questionData && !this.fetchingQuestion) {
      this.fetchingQuestion = true;
      const data = await apiCall('GET', `/game/${this.gameId}/question/${state.questionNumber}`);
      if (!data.error) {
        this.questionData = data;
      }
      this.fetchingQuestion = false;
    }

    // Render based on phase
    if (state.questionPhase === 'category_splash') {
      this.renderCategorySplash(state);
    } else if (state.questionPhase === 'scores') {
      this.renderScoresPhase(state);
    } else {
      this.renderQuestion(state);
    }
  },

  renderCategorySplash(state) {
    const container = document.getElementById('game-content');
    const q = this.questionData;
    const category = q ? q.category : '';
    const subcategory = q ? (q.subcategory || '') : '';

    // Countdown: 5 seconds total, show 5→1 then GO!
    const secondsLeft = Math.ceil((5000 - state.elapsedInQuestion) / 1000);
    const countDisplay = secondsLeft > 0 ? secondsLeft : 'GO!';

    // Only rebuild DOM when the countdown number changes
    const splashKey = `splash|${state.questionNumber}|${countDisplay}`;
    if (splashKey === this._lastStructuralKey) return;
    this._lastStructuralKey = splashKey;

    const categoryLine = category
      ? `${category}${subcategory ? ` — ${subcategory}` : ''}`
      : '';

    const _barNameSplash = Player.getBarName();
    container.innerHTML = `
      <div class="p-category-splash">
        <div class="logo-small"><span class="logo__tap">Tap</span><span class="logo__trivia">Trivia</span></div>
        ${_barNameSplash ? `<div class="p-bar-name">${_barNameSplash}</div>` : ''}
        <div class="p-cat-qnum">QUESTION ${state.questionNumber} OF 15</div>
        ${categoryLine ? `<div class="p-cat-sub">${categoryLine}</div>` : ''}
        <div class="p-countdown-ring">
          <span class="p-countdown-num" key="${countDisplay}">${countDisplay}</span>
        </div>
        <div class="p-cat-ready">Get ready!</div>
        <div class="p-cat-hint">Answer fast for more points</div>
      </div>
    `;
  },

  renderQuestion(state) {
    const q = this.questionData;
    if (!q) return;

    const { hintsVisible, correctRevealed, canAnswer, elapsedInQuestion } = state;
    const eliminatedIndices = (hintsVisible || []).map(h => q.eliminateOrder[h]);
    const points = canAnswer ? calculatePoints(elapsedInQuestion) : 0;

    // Timer: 45-second countdown (5s–50s), synced with TV app
    const remainingSec = state.questionSecondsRemaining;
    const timerPct = remainingSec / 45;
    const timerR = 30;
    const timerC = 2 * Math.PI * timerR;
    const timerOffset = timerC * (1 - timerPct);

    // Points display
    let pointsDisplay = points;
    const isReadTime = state.questionPhase === 'read_time';
    if (isReadTime) pointsDisplay = 1000;

    // Points color: green > 60%, gold > 30%, red <= 30%
    const ptsPct = pointsDisplay / 1000;
    let ptsColorClass = 'pts-green';
    if (!isReadTime && ptsPct <= 0.3) ptsColorClass = 'pts-red';
    else if (!isReadTime && ptsPct <= 0.6) ptsColorClass = 'pts-gold';

    // Timer color (synced with TV: >50% green, >20% yellow, else red)
    let timerClass = 'timer-plenty';
    if (timerPct <= 0.2) timerClass = 'timer-danger';
    else if (timerPct <= 0.5) timerClass = 'timer-warning';

    // Progress bar
    const progressPct = (state.questionNumber / 15 * 100);

    // Category emoji
    const catEmoji = this.getCategoryEmoji(q.category);

    // Structural key — full rebuild only when question or phase changes
    const structuralKey = `${state.questionNumber}|${state.questionPhase}`;
    // State key — in-place update when answer state changes
    const selectedIdx = this.answerResult ? this.answerResult.selectedIndex : -1;
    const stateKey = `${selectedIdx}|${eliminatedIndices.join(',')}|${correctRevealed}`;

    const container = document.getElementById('game-content');

    // Full rebuild only when the question/phase structurally changes
    if (structuralKey !== this._lastStructuralKey) {
      this._lastStructuralKey = structuralKey;
      this._lastStateKey = stateKey;

      // Build answer buttons
      const locked = correctRevealed || !canAnswer;
      const letters = ['A', 'B', 'C', 'D'];
      let answersHtml = '';
      for (let i = 0; i < q.answers.length; i++) {
        const btnState = this._getAnswerButtonState(i, q, eliminatedIndices, correctRevealed, locked, letters);
        answersHtml += `
          <button class="${btnState.cls}" data-index="${i}" ${btnState.disabled} onpointerdown="QuestionScreen.submitAnswer(${i})">
            <span class="p-answer-letter">${btnState.letterContent}</span>
            <span class="p-answer-text">${btnState.text}</span>
          </button>
        `;
      }

      // Points section
      const pointsSectionHtml = this._buildPointsSectionHtml(correctRevealed, isReadTime, pointsDisplay, ptsPct, ptsColorClass);

      const _barName = Player.getBarName();
      container.innerHTML = `
        <div class="p-game-top">
          <div class="logo-small"><span class="logo__tap">Tap</span><span class="logo__trivia">Trivia</span></div>
          ${_barName ? `<div class="p-bar-name">${_barName}</div>` : ''}
        </div>

        <div class="p-points-section" id="points-section">
          ${pointsSectionHtml}
        </div>

        <div class="p-total-row">
          <div class="p-total-pill">
            <span class="p-total-label">TOTAL</span>
            <span class="p-total-value" id="total-score">${this.totalGameScore.toLocaleString()}</span>
          </div>
        </div>

        <div class="p-timer-section">
          <svg class="p-timer-circle" viewBox="0 0 70 70">
            <circle class="timer-bg" cx="35" cy="35" r="${timerR}" />
            <circle class="timer-fg ${timerClass}" id="timer-ring-fg" cx="35" cy="35" r="${timerR}"
              style="stroke-dasharray:${timerC}; stroke-dashoffset:${timerOffset}" />
          </svg>
          <span class="p-timer-number ${timerClass}" id="timer-sec">${remainingSec}</span>
        </div>

        <div class="p-category-row">
          <div class="p-category-badge">
            <span class="p-cat-emoji">${catEmoji}</span>
            <span class="p-cat-label">${q.category.toUpperCase()}</span>
          </div>
          <div class="p-q-number">${state.questionNumber}<span class="p-q-total">/15</span></div>
        </div>

        <div class="p-progress-bar">
          <div class="p-progress-fill" style="width:${progressPct}%"></div>
        </div>

        <div class="p-question-text">${q.question}</div>

        <div class="p-answers" id="answers-container">
          ${answersHtml}
        </div>
      `;
      return;
    }

    // In-place update when answer state changes (selection, elimination, reveal)
    if (stateKey !== this._lastStateKey) {
      this._lastStateKey = stateKey;

      // Update answer buttons in-place (avoid animation replay)
      const locked = correctRevealed || !canAnswer;
      const letters = ['A', 'B', 'C', 'D'];
      const buttons = container.querySelectorAll('.p-answer-btn');
      buttons.forEach((btn, i) => {
        const btnState = this._getAnswerButtonState(i, q, eliminatedIndices, correctRevealed, locked, letters);
        // Kill slideUp animation so class swap doesn't replay it
        btn.style.animation = 'none';
        btn.className = btnState.cls;
        btn.disabled = !!btnState.disabled;
        btn.querySelector('.p-answer-letter').textContent = btnState.letterContent;
        btn.querySelector('.p-answer-text').textContent = btnState.text;
      });

      // Update points section in-place
      const pointsSection = container.querySelector('#points-section');
      if (pointsSection) {
        pointsSection.innerHTML = this._buildPointsSectionHtml(correctRevealed, isReadTime, pointsDisplay, ptsPct, ptsColorClass);
      }

      // Update total score
      const totalEl = container.querySelector('#total-score');
      if (totalEl) totalEl.textContent = this.totalGameScore.toLocaleString();
      return;
    }

    // Fast-path: only update dynamic elements (timer + points) per frame
    if (!this.answerResult) {
      const ptsEl = container.querySelector('#pts-number');
      if (ptsEl) {
        ptsEl.textContent = pointsDisplay.toLocaleString();
        ptsEl.className = `p-points-number ${ptsColorClass}`;
      }
      const drainEl = container.querySelector('#pts-drain');
      if (drainEl) {
        drainEl.style.width = `${ptsPct * 100}%`;
        drainEl.className = `p-points-drain-fill ${ptsColorClass}`;
      }
    }

    const timerFg = container.querySelector('#timer-ring-fg');
    if (timerFg) {
      timerFg.className.baseVal = `timer-fg ${timerClass}`;
      timerFg.style.strokeDasharray = timerC;
      timerFg.style.strokeDashoffset = timerOffset;
    }

    const timerNum = container.querySelector('#timer-sec');
    if (timerNum) {
      timerNum.textContent = remainingSec;
      timerNum.className = `p-timer-number ${timerClass}`;
    }

    const totalEl = container.querySelector('#total-score');
    if (totalEl) totalEl.textContent = this.totalGameScore.toLocaleString();
  },

  _getAnswerButtonState(i, q, eliminatedIndices, correctRevealed, locked, letters) {
    let cls = 'p-answer-btn';
    let text = q.answers[i];
    let disabled = '';
    let letterContent = letters[i];

    if (this.answerResult && this.answerResult.selectedIndex === i) {
      if (correctRevealed) {
        if (this.answerResult.correct) {
          cls += ' answer-correct';
          letterContent = '✓';
        } else {
          cls += ' answer-wrong';
          letterContent = '✗';
        }
      } else {
        cls += ' answer-selected';
      }
    }

    if (eliminatedIndices.includes(i)) {
      cls += ' answer-eliminated';
      text = `NOT ${q.answers[i]}`;
      disabled = ' disabled';
    } else if (correctRevealed) {
      if (this.answerResult && q.answers[i] === this.answerResult.correctAnswer) {
        cls += ' answer-revealed';
        letterContent = '✓';
      }
      disabled = ' disabled';
    }

    if (locked) disabled = ' disabled';

    return { cls, text, disabled, letterContent };
  },

  _buildPointsSectionHtml(correctRevealed, isReadTime, pointsDisplay, ptsPct, ptsColorClass) {
    if (correctRevealed && this.answerResult) {
      if (this.answerResult.correct) {
        const pts = this.answerResult.pointsAwarded || this.answerResult.displayPoints;
        return `
          <div class="p-points-number pts-correct" id="pts-number">+${pts.toLocaleString()}</div>
          <div class="p-points-sublabel" style="color:var(--green)">CORRECT!</div>
        `;
      } else {
        return `
          <div class="p-points-number pts-wrong" id="pts-number">+0</div>
          <div class="p-points-sublabel" style="color:var(--red)">WRONG</div>
        `;
      }
    } else if (correctRevealed && !this.answerResult) {
      return `
        <div class="p-points-number pts-red" id="pts-number">+0</div>
        <div class="p-points-sublabel" style="color:var(--text-muted)">TIME'S UP</div>
      `;
    } else if (this.answerResult && this.answerResult.selectedIndex !== undefined) {
      const lockedPts = this.answerResult.displayPoints || this.answerResult.pointsAwarded;
      return `
        <div class="p-points-number pts-locked" id="pts-number">${lockedPts.toLocaleString()}</div>
        <div class="p-points-sublabel pts-locked-label">LOCKED IN! <span style="color:var(--text-muted)">/ 1,000</span></div>
      `;
    } else {
      return `
        <div class="p-points-number ${ptsColorClass}" id="pts-number">${pointsDisplay.toLocaleString()}</div>
        <div class="p-points-sublabel">${isReadTime ? 'READ THE QUESTION' : 'POINTS AVAILABLE'}</div>
        <div class="p-points-drain">
          <div class="p-points-drain-fill ${ptsColorClass}" id="pts-drain" style="width:${ptsPct * 100}%"></div>
        </div>
      `;
    }
  },

  renderScoresPhase(state) {
    const container = document.getElementById('game-content');
    container.innerHTML = `
      <div class="p-scores-flash">
        <div class="p-scores-title">Your Score</div>
        <div class="p-scores-total">${this.totalGameScore.toLocaleString()}</div>
        ${this.answerResult ? `<div class="p-scores-last">+${this.answerResult.pointsAwarded} this question</div>` : ''}
        <div class="p-scores-next">Next question in a moment...</div>
      </div>
    `;
  },

  async submitAnswer(index) {
    if (!this.questionData) return;
    // If same answer selected, ignore
    if (this.answerResult && this.answerResult.selectedIndex === index) return;
    // Prevent spamming while a request is in flight
    if (this.submitting) return;
    this.submitting = true;

    const q = this.questionData;
    const selectedAnswer = q.answers[index];

    // Immediate visual feedback — calculate points client-side right now
    const state = getGameState(this.gameStartEpoch, Date.now());
    const clientPoints = calculatePoints(state.elapsedInQuestion);
    this.answerResult = {
      selectedIndex: index,
      correct: false,
      pointsAwarded: 0,
      displayPoints: clientPoints,
      correctAnswer: this.answerResult?.correctAnswer || ''
    };

    const result = await apiCall('POST', `/game/${this.gameId}/answer`, {
      questionNumber: this.currentQuestionNumber,
      selectedAnswer,
      playerName: Player.getName(),
      clientElapsedMs: state.elapsedInQuestion
    });

    this.submitting = false;

    if (!result.error) {
      this.answerResult = {
        selectedIndex: index,
        correct: result.correct,
        pointsAwarded: result.pointsAwarded,
        displayPoints: clientPoints,
        correctAnswer: result.correctAnswer
      };
      this.totalGameScore = result.totalGameScore || this.totalGameScore + result.pointsAwarded;
    }
  },

  buildDots(level) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="dot ${i <= level ? 'filled' : ''}">●</span>`;
    }
    return html;
  },

  getCategoryEmoji(category) {
    const lower = (category || '').toLowerCase();
    const map = {
      'entertainment': '🎬', 'science': '🔬', 'history': '📜',
      'geography': '🌍', 'sports': '⚽', 'music': '🎵',
      'art': '🎨', 'literature': '📚', 'technology': '💻',
      'food': '🍕', 'animals': '🐾', 'nature': '🌿',
      'politics': '🏛️', 'government': '🏛️', 'math': '🔢',
      'language': '📝', 'pop culture': '🌟', 'movies': '🎥',
      'television': '📺', 'gaming': '🎮', 'space': '🚀',
    };
    for (const [key, emoji] of Object.entries(map)) {
      if (lower.includes(key)) return emoji;
    }
    return '🧠';
  }
};
