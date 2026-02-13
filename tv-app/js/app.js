/**
 * TapTrivia — TV App Controller
 * Ported from taptrivia-v4.jsx (source of truth)
 *
 * Architecture:
 *   - Single renderScreen(gameState) entry point
 *   - gameState object drives all screen transitions
 *   - API polling every 5s updates gameState
 *   - Pure DOM manipulation, no framework
 *   - All sizes at 2× for 1920×1080 (v4 renders at 960×540)
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  let barCode = localStorage.getItem('tt_bar_code') || '';
  let barName = localStorage.getItem('tt_bar_name') || '';
  let tvDeviceId = localStorage.getItem('tt_tv_device_id') || '';
  let currentScreen = '';
  let pollInterval = null;
  let consecutiveErrors = 0;
  const MAX_ERRORS_BEFORE_OVERLAY = 3;

  // Local clock state for smooth animation (mirrors player-app approach)
  let localGameStartEpoch = null;
  let localQuestionNumber = null;
  let rafId = null;

  // DOM refs
  const screenEl = document.getElementById('tt-screen');
  const errorOverlay = document.getElementById('tt-error-overlay');

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /** Generate a deterministic hue from a name string (v4 line 130) */
  function nameHue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return h % 360;
  }

  /** Build logo HTML — v4 lines 88-95 */
  function logoHTML(size) {
    return `<span class="tt-logo tt-logo--${size}" aria-label="TapTrivia"><span class="tt-logo__tap">Tap</span><span class="tt-logo__trivia">Trivia</span></span>`;
  }

  /** Build bar name HTML */
  function barNameHTML(size) {
    if (!barName) return '';
    return `<div class="tt-bar-name tt-bar-name--${size}">${barName}</div>`;
  }

  /** Build avatar HTML — v4 lines 129-145 */
  function avatarHTML(name, opts = {}) {
    const { rank, size = 'md', you = false } = opts;
    const h = nameHue(name);
    const h2 = (h + 35) % 360;
    const initial = name.charAt(0).toUpperCase();
    let cls = `tt-avatar tt-avatar--${size}`;
    if (rank === 1) cls += ' tt-avatar--rank1';
    else if (rank === 2) cls += ' tt-avatar--rank2';
    else if (rank === 3) cls += ' tt-avatar--rank3';
    if (you) cls += ' tt-avatar--you';
    const medal = rank && rank <= 3
      ? `<span class="tt-avatar__medal">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>`
      : '';
    return `<div class="${cls}" style="background:linear-gradient(135deg,hsl(${h},65%,52%),hsl(${h2},65%,42%))" aria-label="${name}">${initial}${medal}</div>`;
  }

  /** Build QR code SVG — v4 lines 164-187, size in px (already 2×) */
  function qrCodeHTML(size, cssClass = '') {
    const grid = 25;
    const cellSize = size / grid;
    // Deterministic pseudo-random QR pattern
    let seed = 48271;
    const inFinder = (cx, cy, x, y) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const inBorder = (cx, cy, x, y) => inFinder(cx, cy, x, y) && !(x > cx && x < cx + 6 && y > cy && y < cy + 6);
    const inCore = (cx, cy, x, y) => x >= cx + 2 && x < cx + 5 && y >= cy + 2 && y < cy + 5;
    let rects = '';
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const isFilled = inBorder(0, 0, x, y) || inCore(0, 0, x, y) ||
          inBorder(18, 0, x, y) || inCore(18, 0, x, y) ||
          inBorder(0, 18, x, y) || inCore(0, 18, x, y);
        if (isFilled) {
          rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" rx="${cellSize * 0.12}"/>`;
        } else if (!inFinder(0, 0, x, y) && !inFinder(18, 0, x, y) && !inFinder(0, 18, x, y)) {
          seed = ((seed * 1103515245 + 12345) >>> 0);
          if (seed % 100 < 42) {
            rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" rx="${cellSize * 0.12}"/>`;
          }
        }
      }
    }
    const smClass = size <= 150 ? ' tt-qr--sm' : '';
    return `<div class="tt-qr${smClass} ${cssClass}"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#1e0f4a">${rects}</svg></div>`;
  }

  /** Build QR badge HTML — v4 lines 469-489 */
  function qrBadgeHTML(position = 'bl') {
    return `
      <div class="tt-qr-badge tt-qr-badge--${position}">
        ${qrCodeHTML(144)}
        <div class="tt-qr-badge__info">
          <div class="tt-qr-badge__title">Get the App!</div>
          <div class="tt-qr-badge__url">taptrivia.com</div>
          <div class="tt-qr-badge__code-row">
            <span class="tt-qr-badge__code-label">JOIN</span>
            <span class="tt-qr-badge__code">${barCode}</span>
          </div>
        </div>
      </div>`;
  }

  /** Build QR badge for leaderboard sidebar — v4 lines 626-633 */
  function sidebarQRBadgeHTML() {
    return `
      <div class="tt-glass" style="display:flex;align-items:center;gap:28px;margin-top:8px">
        ${qrCodeHTML(120)}
        <div>
          <div style="font-family:'Fredoka',sans-serif;font-size:36px;font-weight:700;color:#f0f0f0;line-height:1.2">Get the App!</div>
          <div style="font-size:26px;font-weight:600;color:#ffd200;margin-top:6px">taptrivia.com</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
            <span style="font-size:20px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:2px">JOIN</span>
            <span style="font-family:'Fredoka',sans-serif;font-size:30px;font-weight:700;color:#ffd200;letter-spacing:4px">${barCode}</span>
          </div>
        </div>
      </div>`;
  }

  /** Build timer SVG — v4 lines 69-85, size in px (already 2×) */
  function timerHTML(sec, total, size, strokeWidth) {
    const r = (size - strokeWidth * 2) / 2;
    const circ = 2 * Math.PI * r;
    const pct = sec / total;
    const tier = pct > 0.5 ? 'safe' : pct > 0.2 ? 'warning' : 'danger';
    const offset = circ * (1 - pct);
    return `
      <div class="tt-timer" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}">
          <circle class="tt-timer__track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${strokeWidth}"/>
          <circle class="tt-timer__ring tt-timer__ring--${tier}" cx="${size / 2}" cy="${size / 2}" r="${r}"
            stroke-width="${strokeWidth}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <span class="tt-timer__num tt-timer__num--${tier}" style="font-size:${size * 0.32}px">${sec}</span>
      </div>`;
  }

  /** Build answer card HTML — v4 lines 98-126 */
  function answerCardHTML(text, letterIndex, state, opts = {}) {
    const { delay = 0, pctPicked, correctAnswer } = opts;
    const letter = String.fromCharCode(64 + letterIndex); // A, B, C, D
    let letterContent = letter;
    if (state === 'correct') letterContent = '✓';
    else if (state === 'wrong') letterContent = '✗';
    const emoji = state === 'correct' ? '<span class="tt-answer__emoji">🎉</span>' : '';
    const delayClass = state === 'default' ? ` tt-answer--delay-${delay}` : '';

    // Percentage overlay for answer reveal
    let pctOverlay = '';
    if (pctPicked !== undefined) {
      pctOverlay = `
        <div class="tt-answer__pct-bar" style="width:${pctPicked}%"></div>
        <span class="tt-answer__pct-label">${pctPicked}%</span>`;
    }

    return `
      <div class="tt-answer tt-answer--${state}${delayClass}" aria-label="Answer ${letter}: ${text}">
        ${pctOverlay}
        <div class="tt-answer__letter">${letterContent}</div>
        <span class="tt-answer__text">${text}</span>
        ${emoji}
      </div>`;
  }

  /** Build difficulty dots — v4 lines 547-549 */
  function difficultyHTML(level, maxLevel = 5) {
    let html = '<div class="tt-difficulty">';
    for (let i = 1; i <= maxLevel; i++) {
      html += `<div class="tt-difficulty__dot tt-difficulty__dot--${i <= level ? 'active' : 'inactive'}"></div>`;
    }
    const labels = ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Expert'];
    html += `<span class="tt-difficulty__label">${labels[level] || ''}</span>`;
    html += '</div>';
    return html;
  }

  /** Build podium HTML — v4 lines 603-614, order: 2nd, 1st, 3rd */
  function podiumHTML(players, opts = {}) {
    const { avatarSizes = ['xl', '2xl', 'xl'], showScore = true } = opts;
    if (!players || players.length === 0) return '';
    // Pad to 3 entries — empty slots get null
    const padded = [players[0] || null, players[1] || null, players[2] || null];
    // Display order: 2nd, 1st, 3rd (v4 uses [1,0,2] indices)
    const order = [
      { p: padded[1], rank: 2, bar: '2nd', nameClass: '', scoreClass: 'other', avatarSize: avatarSizes[0] },
      { p: padded[0], rank: 1, bar: '1st', nameClass: '--first', scoreClass: 'first', avatarSize: avatarSizes[1] },
      { p: padded[2], rank: 3, bar: '3rd', nameClass: '', scoreClass: 'other', avatarSize: avatarSizes[2] },
    ];
    let html = '<div class="tt-podium">';
    order.forEach((item, idx) => {
      if (item.p) {
        const name = item.p.name || item.p.playerName || 'Player';
        const score = item.p.score || 0;
        html += `
          <div class="tt-podium__place" style="animation:slideUp .5s ease-out ${idx * 0.1}s both">
            <div style="animation:medalDrop .5s ease-out ${idx * 0.15 + 0.3}s both">
              ${avatarHTML(name, { rank: item.rank, size: item.avatarSize })}
            </div>
            <div class="tt-podium__name${item.nameClass}">${name}</div>
            ${showScore ? `<div class="tt-podium__score tt-podium__score--${item.scoreClass}">${score.toLocaleString()}</div>` : ''}
            <div class="tt-podium__bar tt-podium__bar--${item.bar}">
              <span class="tt-podium__rank tt-podium__rank--${item.rank === 1 ? '1st' : 'other'}">${item.rank}</span>
            </div>
          </div>`;
      } else {
        // Empty pedestal — show the bar with rank number but no avatar/name/score
        html += `
          <div class="tt-podium__place tt-podium__place--empty" style="animation:slideUp .5s ease-out ${idx * 0.1}s both">
            <div class="tt-podium__bar tt-podium__bar--${item.bar}">
              <span class="tt-podium__rank tt-podium__rank--other">${item.rank}</span>
            </div>
          </div>`;
      }
    });
    html += '</div>';
    return html;
  }

  /** Build leaderboard rows HTML */
  function leaderboardRowsHTML(players, startRank, opts = {}) {
    const { compact = false } = opts;
    let html = '';
    players.forEach((p, i) => {
      const rank = startRank + i;
      const name = p.name || p.playerName || 'Player';
      const score = p.score || 0;
      const isYou = p.isYou;
      const rankClass = rank <= 3 ? ' tt-lb-row__rank--gold' : '';
      const nameClass = isYou ? ' tt-lb-row__name--you' : '';
      const youTag = isYou ? '<span class="tt-lb-row__you-tag">YOU</span>' : '';
      const movement = p.movement > 0 ? `<span class="tt-lb-row__movement tt-lb-row__movement--up">▲${p.movement}</span>`
        : p.movement < 0 ? `<span class="tt-lb-row__movement tt-lb-row__movement--down">▼${Math.abs(p.movement)}</span>` : '';
      const streak = p.streak && p.streak >= 3 ? `<span class="tt-lb-row__streak">🔥${p.streak}</span>` : '';
      html += `
        <div class="tt-lb-row" style="animation:rankSlide .3s ease-out ${i * 0.04}s both">
          <span class="tt-lb-row__rank${rankClass}">${rank}</span>
          ${avatarHTML(name, { rank, size: compact ? 'xs' : 'sm', you: isYou })}
          <span class="tt-lb-row__name${nameClass}">${name}${youTag}${movement}${streak}</span>
          <span class="tt-lb-row__score">${score.toLocaleString()}</span>
        </div>`;
    });
    return html;
  }

  /** Build confetti pieces HTML — v4 lines 159-161 */
  function confettiHTML(count) {
    const colors = ['#ffd200', '#ff4757', '#00d4aa', '#667eea', '#764ba2', '#ff6b81', '#ffe066'];
    let html = '<div class="tt-results__confetti-layer" aria-hidden="true">';
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const left = 3 + i * (94 / count);
      const w = 10 + Math.floor((i * 7) % 14); // pseudo-random size 10-24
      const h = w * 1.4;
      const dur = 1.5 + (i * 0.7) % 1.5; // 1.5-3s
      const delay = i * 0.1;
      const rot = (i * 73) % 360;
      html += `<div class="tt-confetti" style="left:${left}%;width:${w}px;height:${h}px;background:${color};transform:rotate(${rot}deg);animation:confetti1 ${dur}s ease-out ${delay}s forwards"></div>`;
    }
    html += '</div>';
    return html;
  }

  /** Player count badge */
  function playersBadgeHTML(count) {
    return `<div class="tt-players-badge"><span class="tt-players-badge__icon">👥</span><span class="tt-players-badge__count">${count}</span></div>`;
  }

  /** Category pill */
  function categoryPillHTML(icon, name) {
    return `<div class="tt-pill"><span class="tt-pill__icon">${icon || '🧠'}</span><span class="tt-pill__text">${name || 'Trivia'}</span></div>`;
  }

  /** Progress bar */
  function progressHTML(current, total) {
    const pct = total > 0 ? (current / total) * 100 : 0;
    return `<div class="tt-progress"><div class="tt-progress__fill" style="width:${pct}%"></div></div>`;
  }

  /** Waiting dots animation */
  function waitingDotsHTML() {
    return '<div class="tt-waiting-dots"><div class="tt-waiting-dots__dot"></div><div class="tt-waiting-dots__dot"></div><div class="tt-waiting-dots__dot"></div></div>';
  }

  /** Points color tier based on percentage */
  function pointsTier(pct) {
    return pct > 0.6 ? 'safe' : pct > 0.3 ? 'warning' : 'danger';
  }

  /** Points color value based on tier */
  function pointsColor(tier) {
    return { safe: '#00d4aa', warning: '#ffd200', danger: '#ff4757' }[tier] || '#ffd200';
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN RENDERERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Main entry point — renders the appropriate screen based on gameState.
   * @param {Object} gameState
   * @param {string} gameState.screen - "idle"|"setup"|"lobby"|"getready"|"category"|"playing"|"reveal"|"between"|"leaderboard"|"results"
   */
  function renderScreen(gameState) {
    const { screen } = gameState;
    const qNum = gameState.questionNumber || 0;
    const questionChanged = qNum !== localQuestionNumber;

    // Same screen + same question: surgical update instead of full re-render
    if (screen === currentScreen && !questionChanged) {
      if (screen === 'playing') { updatePlayingDynamic(gameState); return; }
      if (screen === 'reveal') { updateRevealDynamic(gameState); return; }
      return; // All other screens: static, no update needed
    }

    // Stop local clock when leaving playing screen
    if (currentScreen === 'playing' && screen !== 'playing') stopLocalClock();

    currentScreen = screen;
    if (qNum) localQuestionNumber = qNum;

    switch (screen) {
      case 'idle':
        localGameStartEpoch = null;
        return renderIdle(gameState);
      case 'setup': return renderSetup(gameState);
      case 'lobby': return renderLobby(gameState);
      case 'getready': return renderGetReady(gameState);
      case 'category': return renderCategory(gameState);
      case 'playing':
        renderPlaying(gameState);
        startLocalClock();
        return;
      case 'reveal':
        stopLocalClock();
        return renderReveal(gameState);
      case 'between': return renderBetween(gameState);
      case 'leaderboard': return renderLeaderboard(gameState);
      case 'results':
        localGameStartEpoch = null;
        return renderResults(gameState);
      default: return renderIdle(gameState);
    }
  }

  /** IDLE / ATTRACT SCREEN */
  function renderIdle() {
    screenEl.innerHTML = `
      <div class="tt-idle">
        <div class="tt-idle__logo">${logoHTML('xl')}</div>
        ${barNameHTML('xl')}
        <div class="tt-idle__cta">Ask your bartender to start a game!</div>
        <div class="tt-idle__sub">Live trivia, right from your phone</div>
      </div>`;
  }

  /** SETUP SCREEN — bar registration */
  function renderSetup() {
    screenEl.innerHTML = `
      <div class="tt-setup">
        ${logoHTML('xl')}
        <div class="tt-setup__subtitle">Enter Your Bar Name</div>
        <input type="text" id="tt-setup-input" class="tt-setup__input" placeholder="Murphy's Pub" maxlength="50" autocomplete="off" aria-label="Bar name">
        <button id="tt-setup-btn" class="tt-setup__btn">GET YOUR BAR CODE</button>
        <div class="tt-setup__hint">Use your TV's remote to type or connect a USB keyboard</div>
      </div>`;
    // Bind events
    const input = document.getElementById('tt-setup-input');
    const btn = document.getElementById('tt-setup-btn');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') registerBar(); });
    btn.addEventListener('click', registerBar);
    input.focus();
  }

  /** LOBBY SCREEN — v4 lines 492-521 */
  function renderLobby(state) {
    const players = state.players || [];
    const count = state.playerCount || players.length || 0;

    let playerGrid = '';
    players.forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      playerGrid += `
        <div class="tt-lobby__player" style="animation:popIn .3s ease-out ${i * 0.05}s both">
          ${avatarHTML(name, { size: 'lg' })}
          <span class="tt-lobby__player-name">${name}</span>
        </div>`;
    });

    screenEl.innerHTML = `
      <div class="tt-lobby">
        <div class="tt-lobby__left">
          <div class="tt-lobby__logo">${logoHTML('xl')}</div>
          ${barNameHTML('lg')}
          <div class="tt-lobby__subtitle">Scan to join or enter code below</div>
          ${qrCodeHTML(360)}
          <div class="tt-lobby__code-section">
            <div class="tt-lobby__code-label">Or Enter Code</div>
            <div class="tt-lobby__code">${barCode}</div>
            <div class="tt-lobby__url">taptrivia.com/join</div>
          </div>
        </div>
        <div class="tt-lobby__right">
          <div class="tt-lobby__player-label">${count} Players Ready</div>
          <div class="tt-lobby__player-grid">${playerGrid}</div>
          <div class="tt-lobby__waiting">
            <span class="tt-lobby__waiting-text">Waiting for host</span>
            ${waitingDotsHTML()}
          </div>
        </div>
      </div>`;
  }

  /** GET READY SCREEN — v4 lines 524-537 */
  function renderGetReady(state) {
    const countdown = state.countdown || 3;
    const totalQuestions = state.totalQuestions || 15;
    screenEl.innerHTML = `
      <div class="tt-getready">
        ${logoHTML('lg')}
        ${barNameHTML('lg')}
        <div class="tt-getready__label">Game Starting</div>
        <div class="tt-getready__ring">
          <span class="tt-getready__num">${countdown}</span>
        </div>
        <div class="tt-getready__sub">Get ready!</div>
        <div class="tt-getready__info">${totalQuestions} questions · Answer fast for more points</div>
      </div>
      ${qrBadgeHTML('bl')}`;
  }

  /** CATEGORY SCREEN — v4 lines 540-554 */
  function renderCategory(state) {
    const q = state.question || {};
    const num = state.questionNumber || 1;
    const total = state.totalQuestions || 15;
    const icon = q.categoryIcon || state.categoryIcon || '🧠';
    const category = q.category || state.category || 'Trivia';
    const sub = q.subcategory || state.subcategory || '';
    const diff = q.difficulty || state.difficulty || 3;

    screenEl.innerHTML = `
      <div class="tt-category">
        ${barNameHTML('md')}
        <div class="tt-category__counter">QUESTION ${num} OF ${total}</div>
        <div class="tt-category__icon">${icon}</div>
        <div class="tt-category__name">${category}</div>
        ${sub ? `<div class="tt-category__sub">${sub}</div>` : ''}
        <div class="tt-category__difficulty">${difficultyHTML(diff)}</div>
      </div>
      ${qrBadgeHTML('bl')}`;
  }

  /** PLAYING SCREEN — v4 lines 557-595 */
  function renderPlaying(state) {
    const q = state.question || {};
    const answers = q.answers || [];
    const timer = state.timer || {};
    const remaining = timer.remaining || 0;
    const total = timer.total || 20;
    const sec = Math.ceil(remaining);
    const scores = state.scores || [];
    const playerCount = state.playerCount || 0;
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    const icon = q.categoryIcon || '🧠';
    const category = q.category || 'Trivia';
    const maxPts = state.maxPoints || 1000;
    const pts = state.pointsAvailable || Math.max(100, Math.round(maxPts * (remaining / total)));
    const ptsPct = pts / maxPts;
    const tier = pointsTier(ptsPct);
    const color = pointsColor(tier);

    let answersHTML = '';
    answers.forEach((a, i) => {
      const text = typeof a === 'string' ? a : (a.text || '');
      answersHTML += answerCardHTML(text, i + 1, 'default', { delay: i });
    });

    let footerPlayers = '';
    scores.slice(0, 5).forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      footerPlayers += `
        <div class="tt-play__footer-player">
          ${avatarHTML(name, { rank: i + 1, size: 'sm' })}
          <div>
            <div class="tt-play__footer-name">${name}</div>
            <div class="tt-play__footer-score">${(p.score || 0).toLocaleString()}</div>
          </div>
        </div>`;
    });

    screenEl.innerHTML = `
      <div class="tt-play">
        <!-- Header -->
        <div class="tt-play__header">
          <div style="display:flex;flex-direction:column;gap:4px">${logoHTML('sm')}${barNameHTML('header')}</div>
          <div class="tt-play__pts-area">
            <div id="tv-pts-value" class="tt-play__pts-value" style="color:${color};filter:drop-shadow(0 4px 16px ${color}40)">${pts}</div>
            <div class="tt-play__pts-label">Points Available</div>
          </div>
          <div class="tt-play__header-right">
            <div id="tv-players-badge">${playersBadgeHTML(playerCount)}</div>
            <div id="tv-timer">${timerHTML(sec, total, 96, 6)}</div>
          </div>
        </div>
        <!-- Body -->
        <div class="tt-play__body">
          <div class="tt-play__question-col">
            <div class="tt-play__cat-row">
              ${categoryPillHTML(icon, category)}
              <span class="tt-play__q-counter">Q${num}<span class="tt-play__q-counter-sep">/${totalQ}</span></span>
            </div>
            <div class="tt-play__question">${q.text || ''}</div>
            <div class="tt-play__progress">${progressHTML(num, totalQ)}</div>
          </div>
          <div id="tv-answers" class="tt-play__answers-col">${answersHTML}</div>
        </div>
        <!-- Footer -->
        <div class="tt-play__footer">
          <div id="tv-footer-scores" class="tt-play__footer-scores">${footerPlayers}</div>
        </div>
        ${qrBadgeHTML('bl')}
      </div>`;
  }

  /** ANSWER REVEAL SCREEN — new screen, not in v4 prototype */
  function renderReveal(state) {
    const q = state.question || {};
    const answers = q.answers || [];
    const correctIdx = state.correctAnswerIndex;
    const timer = state.timer || {};
    const scores = state.scores || [];
    const playerCount = state.playerCount || 0;
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    const icon = q.categoryIcon || '🧠';
    const category = q.category || 'Trivia';
    const answerPcts = state.answerPercentages || [];

    let answersHTML = '';
    answers.forEach((a, i) => {
      const text = typeof a === 'string' ? a : (a.text || '');
      let ansState = 'default';
      if (i === correctIdx) ansState = 'correct';
      else if (correctIdx !== undefined) ansState = 'wrong';
      answersHTML += answerCardHTML(text, i + 1, ansState, {
        pctPicked: answerPcts[i],
      });
    });

    let footerPlayers = '';
    scores.slice(0, 5).forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      const correctClass = p.isCurrentCorrect ? 'color:#00d4aa' : '';
      footerPlayers += `
        <div class="tt-play__footer-player">
          ${avatarHTML(name, { rank: i + 1, size: 'sm' })}
          <div>
            <div class="tt-play__footer-name" style="${correctClass}">${name}</div>
            <div class="tt-play__footer-score">${(p.score || 0).toLocaleString()}</div>
          </div>
        </div>`;
    });

    screenEl.innerHTML = `
      <div class="tt-play">
        <div class="tt-play__header">
          <div style="display:flex;flex-direction:column;gap:4px">${logoHTML('sm')}${barNameHTML('header')}</div>
          <div class="tt-play__pts-area">
            <div class="tt-play__pts-value" style="color:#00d4aa">Answer Revealed</div>
          </div>
          <div class="tt-play__header-right">
            <div id="tv-players-badge">${playersBadgeHTML(playerCount)}</div>
            <div id="tv-timer">${timerHTML(0, timer.total || 20, 96, 6)}</div>
          </div>
        </div>
        <div class="tt-play__body">
          <div class="tt-play__question-col">
            <div class="tt-play__cat-row">
              ${categoryPillHTML(icon, category)}
              <span class="tt-play__q-counter">Q${num}<span class="tt-play__q-counter-sep">/${totalQ}</span></span>
            </div>
            <div class="tt-play__question">${q.text || ''}</div>
            <div class="tt-play__progress">${progressHTML(num, totalQ)}</div>
          </div>
          <div class="tt-play__answers-col">${answersHTML}</div>
        </div>
        <div class="tt-play__footer">
          <div id="tv-footer-scores" class="tt-play__footer-scores">${footerPlayers}</div>
        </div>
        ${qrBadgeHTML('bl')}
      </div>`;
  }

  /** BETWEEN QUESTIONS / SCOREBOARD FLASH — new screen */
  function renderBetween(state) {
    const scores = state.scores || [];
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    const nextIn = state.nextQuestionIn || 5;
    // Show full list when fewer than 4 players, otherwise show positions 4-10
    const listScores = scores.length < 4 ? scores.slice(0, 10) : scores.slice(3, 10);
    const listStartRank = scores.length < 4 ? 1 : 4;

    screenEl.innerHTML = `
      <div class="tt-between">
        <div class="tt-between__left">
          ${logoHTML('md')}
          ${barNameHTML('lg')}
          <div class="tt-between__after">After Question ${num}</div>
          ${podiumHTML(scores)}
        </div>
        <div class="tt-between__right">
          <div class="tt-between__section-label">Top 10</div>
          ${leaderboardRowsHTML(listScores, listStartRank)}
          <div class="tt-between__next">Next question in ${nextIn}s...</div>
          ${sidebarQRBadgeHTML()}
        </div>
      </div>`;
  }

  /** LEADERBOARD SCREEN — v4 lines 598-637 */
  function renderLeaderboard(state) {
    const scores = state.scores || [];
    const num = state.questionNumber || 1;
    // Show full list when fewer than 4 players, otherwise show positions 4-10
    const listScores = scores.length < 4 ? scores.slice(0, 10) : scores.slice(3, 10);
    const listStartRank = scores.length < 4 ? 1 : 4;

    screenEl.innerHTML = `
      <div class="tt-leaderboard">
        <div class="tt-leaderboard__left">
          ${logoHTML('md')}
          ${barNameHTML('lg')}
          <div class="tt-leaderboard__after">After Question ${num}</div>
          ${podiumHTML(scores)}
        </div>
        <div class="tt-leaderboard__right">
          <div class="tt-leaderboard__top-label">Top 10</div>
          ${leaderboardRowsHTML(listScores, listStartRank)}
          <div class="tt-leaderboard__next">Next question in 5s...</div>
          ${sidebarQRBadgeHTML()}
        </div>
      </div>`;
  }

  /** RESULTS / GAME OVER SCREEN — v4 lines 640-678 */
  function renderResults(state) {
    const scores = state.scores || [];
    const totalQ = state.totalQuestions || 15;
    const playerCount = state.playerCount || scores.length;

    screenEl.innerHTML = `
      ${confettiHTML(24)}
      <div class="tt-results">
        <div class="tt-results__left">
          ${barNameHTML('lg')}
          <div class="tt-results__trophy">🏆</div>
          <div class="tt-results__title">Game Over!</div>
          <div class="tt-results__subtitle">${totalQ} questions · ${playerCount} players</div>
          ${podiumHTML(scores, { avatarSizes: ['xl', '3xl', 'xl'] })}
        </div>
        <div class="tt-results__right">
          <div class="tt-results__standings-label">Final Standings</div>
          ${leaderboardRowsHTML(scores.slice(0, 10), 1, { compact: true })}
          ${sidebarQRBadgeHTML()}
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ERROR OVERLAY
  // ═══════════════════════════════════════════════════════════════
  function showError() { errorOverlay.classList.remove('tt-hidden'); }
  function hideError() { errorOverlay.classList.add('tt-hidden'); }

  // ═══════════════════════════════════════════════════════════════
  // SURGICAL DOM UPDATES (avoid full re-render, preserve animations)
  // ═══════════════════════════════════════════════════════════════

  function updatePlayingDynamic(state) {
    // Timer + points handled by local clock when running; fallback to API values
    if (!rafId) {
      updateTimerFromState(state);
      updatePointsFromState(state);
    }

    // Player count (always from API)
    const playersEl = document.getElementById('tv-players-badge');
    if (playersEl) playersEl.innerHTML = playersBadgeHTML(state.playerCount || 0);

    // Eliminated answer hints
    updateAnswerHints(state);

    // Footer scores
    updateFooterScores(state);
  }

  function updateRevealDynamic(state) {
    const playersEl = document.getElementById('tv-players-badge');
    if (playersEl) playersEl.innerHTML = playersBadgeHTML(state.playerCount || 0);

    updateFooterScores(state);
  }

  function updateTimerFromState(state) {
    const timerWrap = document.getElementById('tv-timer');
    if (!timerWrap) return;
    const timer = state.timer || {};
    const remaining = timer.remaining || 0;
    const total = timer.total || 45;
    const sec = Math.ceil(remaining);
    timerWrap.innerHTML = timerHTML(sec, total, 96, 6);
  }

  function updatePointsFromState(state) {
    const ptsEl = document.getElementById('tv-pts-value');
    if (!ptsEl) return;
    const pts = state.pointsAvailable || 0;
    const ptsPct = pts / (state.maxPoints || 1000);
    const tier = pointsTier(ptsPct);
    const color = pointsColor(tier);
    ptsEl.textContent = pts;
    ptsEl.style.color = color;
    ptsEl.style.filter = `drop-shadow(0 4px 16px ${color}40)`;
  }

  function updateAnswerHints(state) {
    const answersEl = document.getElementById('tv-answers');
    if (!answersEl) return;
    const eliminated = state.eliminated || [];
    if (!eliminated.length) return;
    const cards = answersEl.querySelectorAll('.tt-answer');
    const elimSet = new Set(eliminated.map(e => e.index));
    cards.forEach((card, i) => {
      if (elimSet.has(i) && !card.classList.contains('tt-answer--eliminated')) {
        card.classList.add('tt-answer--eliminated');
      }
    });
  }

  function updateFooterScores(state) {
    const el = document.getElementById('tv-footer-scores');
    if (!el) return;
    const scores = state.scores || [];
    let html = '';
    scores.slice(0, 5).forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      const correctStyle = p.isCurrentCorrect ? 'color:#00d4aa' : '';
      html += `
        <div class="tt-play__footer-player">
          ${avatarHTML(name, { rank: i + 1, size: 'sm' })}
          <div>
            <div class="tt-play__footer-name" style="${correctStyle}">${name}</div>
            <div class="tt-play__footer-score">${(p.score || 0).toLocaleString()}</div>
          </div>
        </div>`;
    });
    el.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCAL CLOCK — 60fps timer/points via game-clock.js
  // ═══════════════════════════════════════════════════════════════

  function startLocalClock() {
    stopLocalClock();
    if (!localGameStartEpoch || typeof getGameState !== 'function') return;

    const SIZE = 96, STROKE = 6;
    const r = (SIZE - STROKE * 2) / 2;
    const circ = 2 * Math.PI * r;
    const TIMER_TOTAL = 45;

    function tick() {
      const cs = getGameState(localGameStartEpoch, Date.now());

      if (cs.gamePhase !== 'active') { stopLocalClock(); return; }
      if (cs.questionPhase === 'scores') { rafId = requestAnimationFrame(tick); return; }

      // Timer ring — direct SVG attribute update (no innerHTML)
      const remaining = cs.questionSecondsRemaining || 0;
      const pct = remaining / TIMER_TOTAL;
      const tier = pct > 0.5 ? 'safe' : pct > 0.2 ? 'warning' : 'danger';

      const ring = document.querySelector('#tv-timer .tt-timer__ring');
      if (ring) {
        ring.setAttribute('stroke-dashoffset', String(circ * (1 - pct)));
        ring.className.baseVal = 'tt-timer__ring tt-timer__ring--' + tier;
      }
      const numEl = document.querySelector('#tv-timer .tt-timer__num');
      if (numEl) {
        if (numEl.textContent !== String(remaining)) numEl.textContent = remaining;
        numEl.className = 'tt-timer__num tt-timer__num--' + tier;
      }

      // Points
      const pts = cs.pointsAvailable || 0;
      const ptsPct = pts / 1000;
      const ptsTier = pointsTier(ptsPct);
      const ptsColor = pointsColor(ptsTier);
      const ptsEl = document.getElementById('tv-pts-value');
      if (ptsEl) {
        ptsEl.textContent = pts;
        ptsEl.style.color = ptsColor;
        ptsEl.style.filter = 'drop-shadow(0 4px 16px ' + ptsColor + '40)';
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  function stopLocalClock() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ═══════════════════════════════════════════════════════════════
  // API INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  async function registerBar() {
    const input = document.getElementById('tt-setup-input');
    const btn = document.getElementById('tt-setup-btn');
    const name = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); return; }

    if (btn) { btn.textContent = 'REGISTERING...'; btn.disabled = true; }

    const result = await apiCall('POST', '/bar/register', { barName: name, tvDeviceId });
    if (result.error) {
      if (btn) { btn.textContent = 'GET YOUR BAR CODE'; btn.disabled = false; }
      return;
    }

    barCode = result.barCode;
    barName = result.barName;
    localStorage.setItem('tt_bar_code', barCode);
    localStorage.setItem('tt_bar_name', barName);
    startPolling();
    renderScreen({ screen: 'lobby', playerCount: 0, players: [] });
  }

  // ═══════════════════════════════════════════════════════════════
  // POLLING — translates API response → gameState for renderScreen
  // ═══════════════════════════════════════════════════════════════

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollTvState();
    pollInterval = setInterval(pollTvState, CONFIG.POLL_INTERVAL || 5000);
  }

  async function pollTvState() {
    if (!barCode) return;

    const state = await apiCall('GET', `/game/tv-state?barCode=${barCode}`);

    if (state.error) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_ERRORS_BEFORE_OVERLAY) showError();
      return;
    }

    consecutiveErrors = 0;
    hideError();

    // Translate API response → gameState object for renderScreen
    // Capture gameStartEpoch for local clock
    if (state.gameStartEpoch) {
      localGameStartEpoch = state.gameStartEpoch;
    }

    const gameState = translateApiState(state);
    renderScreen(gameState);
  }

  /**
   * Translates the backend API response into the normalized gameState
   * object that renderScreen expects.
   */
  function translateApiState(apiState) {
    const gs = {
      screen: 'lobby',
      gameCode: barCode,
      playerCount: apiState.activePlayers || 0,
      players: [],
      scores: [],
      question: {},
      timer: { remaining: 0, total: 20 },
      questionNumber: apiState.questionNumber || 0,
      totalQuestions: apiState.totalQuestions || 15,
    };

    // Break state → lobby
    if (apiState.state === 'break') {
      gs.screen = 'lobby';
      gs.players = (apiState.activePlayers_list || []).map(p => ({
        name: p.name || p.playerName,
        score: p.score || 0,
      }));
      return gs;
    }

    // Active game
    if (apiState.state === 'active_game') {
      const phase = apiState.phase;

      // Build scores from leaderboard
      gs.scores = (apiState.barLeaderboard || []).map((p, i) => ({
        name: p.name || p.playerName,
        score: p.score || 0,
        rank: i + 1,
        isCurrentCorrect: p.isCurrentCorrect,
        movement: p.movement,
        streak: p.streak,
      }));

      if (phase === 'category_splash') {
        gs.screen = 'category';
        gs.question = {
          category: apiState.category,
          subcategory: apiState.subcategory,
          categoryIcon: getCategoryIcon(apiState.category),
          difficulty: apiState.difficulty,
        };
      } else if (phase === 'countdown' || phase === 'get_ready') {
        gs.screen = 'getready';
        gs.countdown = apiState.countdown || 3;
      } else if (phase === 'scores' || phase === 'between') {
        gs.screen = 'leaderboard';
      } else if (phase === 'reveal') {
        gs.screen = 'reveal';
        gs.question = {
          text: apiState.question,
          answers: (apiState.answers || []).map((a, i) => ({ id: i, text: a })),
          category: apiState.category,
          categoryIcon: getCategoryIcon(apiState.category),
        };
        gs.correctAnswerIndex = apiState.answers ? apiState.answers.indexOf(apiState.correctAnswer) : -1;
        gs.answerPercentages = apiState.answerPercentages || [];
      } else {
        // Playing phase (read_time, answer_time, etc.)
        gs.screen = 'playing';
        gs.question = {
          text: apiState.question,
          answers: apiState.answers || [],
          category: apiState.category,
          categoryIcon: getCategoryIcon(apiState.category),
        };
        // Calculate timer (answer window: 5s–50s = 45s countdown)
        const elapsed = apiState.elapsedSeconds || 0;
        const remaining = Math.max(0, 50 - elapsed);
        gs.timer = { remaining, total: 45 };
        gs.pointsAvailable = apiState.currentPointsAvailable;
        gs.maxPoints = 1000;
        gs.eliminated = apiState.eliminated || [];
      }
      return gs;
    }

    // Game over
    if (apiState.state === 'game_over') {
      gs.screen = 'results';
      gs.scores = (apiState.barLeaderboard || []).map((p, i) => ({
        name: p.name || p.playerName,
        score: p.score || 0,
        rank: i + 1,
      }));
      return gs;
    }

    return gs;
  }

  /** Map category name to emoji icon — best-effort */
  function getCategoryIcon(category) {
    if (!category) return '🧠';
    const c = category.toLowerCase();
    const map = {
      'science': '🔬', 'history': '📜', 'geography': '🌍', 'sports': '⚽',
      'entertainment': '🎬', 'music': '🎵', 'art': '🎨', 'literature': '📚',
      'technology': '💻', 'nature': '🌿', 'food': '🍕', 'movies': '🎬',
      'tv': '📺', 'gaming': '🎮', 'animals': '🐾', 'math': '🔢',
      'politics': '🏛️', 'space': '🚀', 'mythology': '⚡', 'language': '💬',
      'pop culture': '🌟', 'nhl': '🏒', 'nfl': '🏈', 'nba': '🏀',
      'mlb': '⚾', 'soccer': '⚽', 'olympics': '🏅', 'disney': '🏰',
    };
    for (const [key, icon] of Object.entries(map)) {
      if (c.includes(key)) return icon;
    }
    return '🧠';
  }

  // ═══════════════════════════════════════════════════════════════
  // DEMO MODE — cycle through screens with mock data
  // ═══════════════════════════════════════════════════════════════

  function isDemoMode() {
    return new URLSearchParams(window.location.search).has('demo');
  }

  const DEMO_PLAYERS = [
    { name: 'Sarah M', score: 12450 }, { name: 'Jake', score: 10875 },
    { name: 'Chris K', score: 9640 }, { name: 'Mike D', score: 8920 },
    { name: 'Lisa P', score: 7350 }, { name: 'Tom W', score: 6800 },
    { name: 'Amy R', score: 5920 }, { name: 'Dan B', score: 5100 },
    { name: 'Nicole S', score: 4800 }, { name: 'Ryan T', score: 4200 },
    { name: 'Emma L', score: 3900 }, { name: 'Josh P', score: 3400 },
  ];

  const DEMO_SCREENS = [
    { screen: 'idle' },
    {
      screen: 'lobby',
      playerCount: 12,
      players: DEMO_PLAYERS.map(p => ({ name: p.name })),
    },
    {
      screen: 'getready',
      countdown: 3,
      totalQuestions: 15,
    },
    {
      screen: 'category',
      questionNumber: 7,
      totalQuestions: 15,
      question: { category: 'Entertainment', subcategory: 'Disney Movies', categoryIcon: '🎬', difficulty: 2 },
    },
    {
      screen: 'playing',
      questionNumber: 7,
      totalQuestions: 15,
      playerCount: 12,
      question: {
        text: '"Let It Go" is the theme song of which Disney movie?',
        answers: ['Frozen', 'Tangled', 'Cinderella', 'Snow White'],
        category: 'Entertainment',
        categoryIcon: '🎬',
      },
      timer: { remaining: 14, total: 20 },
      pointsAvailable: 700,
      maxPoints: 1000,
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'reveal',
      questionNumber: 7,
      totalQuestions: 15,
      playerCount: 12,
      question: {
        text: '"Let It Go" is the theme song of which Disney movie?',
        answers: [
          { id: 0, text: 'Frozen' },
          { id: 1, text: 'Tangled' },
          { id: 2, text: 'Cinderella' },
          { id: 3, text: 'Snow White' },
        ],
        category: 'Entertainment',
        categoryIcon: '🎬',
      },
      correctAnswerIndex: 0,
      answerPercentages: [68, 18, 8, 6],
      timer: { remaining: 0, total: 20 },
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'leaderboard',
      questionNumber: 7,
      totalQuestions: 15,
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'results',
      totalQuestions: 15,
      playerCount: 12,
      scores: DEMO_PLAYERS,
    },
  ];

  function runDemoMode() {
    barCode = 'BR7X';
    barName = barName || 'Murphy\'s Pub';
    let idx = 0;

    // Check for specific screen in URL: ?demo&screen=playing
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    if (screenParam) {
      const found = DEMO_SCREENS.findIndex(s => s.screen === screenParam);
      if (found >= 0) idx = found;
    }

    function showNext() {
      currentScreen = ''; // Force re-render
      localQuestionNumber = null; // Reset question tracking for demo
      renderScreen(DEMO_SCREENS[idx]);
      idx = (idx + 1) % DEMO_SCREENS.length;
    }

    showNext();

    // Auto-advance unless a specific screen was requested
    if (!screenParam) {
      setInterval(showNext, 6000);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  async function init() {
    if (!tvDeviceId) {
      tvDeviceId = crypto.randomUUID();
      localStorage.setItem('tt_tv_device_id', tvDeviceId);
    }

    // Demo mode — cycle through screens with mock data
    if (isDemoMode()) {
      runDemoMode();
      return;
    }

    // If we have a stored bar code, verify and enter lobby
    if (barCode) {
      const bar = await apiCall('GET', `/bar/${barCode}`);
      if (bar && !bar.error && bar.status === 'active') {
        barName = bar.barName;
        localStorage.setItem('tt_bar_name', barName);
        startPolling();
        return;
      }
      // Invalid code — clear and show setup
      localStorage.removeItem('tt_bar_code');
      localStorage.removeItem('tt_bar_name');
      barCode = '';
      barName = '';
    }

    renderScreen({ screen: 'setup' });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose renderScreen globally for testing
  window.TapTrivia = { renderScreen };

})();
