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

  // Signage state
  let signageSlides = [];
  let signageRotationSpeed = 15;
  let signageCurrentIndex = 0;
  let signageRotationTimer = null;
  let barLogoUrl = null;
  let barLogoHash = null;

  // Screen rotation state (cycles lobby/between/results during non-gameplay)
  let cachedScreenData = {};
  let rotationActive = false;
  let rotationScreens = [];
  let rotationIdx = 0;
  let rotationTimer = null;
  const ROTATION_INTERVAL_MS = 10000;

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

  /** Build real QR code SVG pointing to play.taptrivia.tv */
  function qrCodeHTML(size, cssClass = '') {
    const url = 'https://play.taptrivia.tv';
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const cellSize = size / count;
    let rects = '';
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        if (qr.isDark(y, x)) {
          rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" rx="${cellSize * 0.1}"/>`;
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
        ${qrCodeHTML(120)}
        <div class="tt-qr-badge__info">
          <div class="tt-qr-badge__title">Join Trivia!</div>
          <div class="tt-qr-badge__url">play.taptrivia.tv</div>
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
          <div style="font-family:'Fredoka',sans-serif;font-size:36px;font-weight:700;color:#f0f0f0;line-height:1.2">Join Trivia!</div>
          <div style="font-size:26px;font-weight:600;color:#ffd200;margin-top:6px">play.taptrivia.tv</div>
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
    else if (state === 'wrong' || state === 'dimmed') letterContent = '✗';
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
  // SIGNAGE — Full-Screen & In-Game Panel Renderers
  // ═══════════════════════════════════════════════════════════════

  /** Bar logo HTML for signage contexts */
  function signageBarLogoHTML(context) {
    if (barLogoUrl) {
      return `<img src="${barLogoUrl}" alt="${barName}">`;
    }
    const initial = barName ? barName.charAt(0).toUpperCase() : 'B';
    const cls = context === 'panel' ? 'tt-signage-panel__bar-initial' : 'tt-signage-header__bar-initial';
    return `<span class="${cls}">${initial}</span>`;
  }

  /** Full-screen signage header (bar logo + name + TapTrivia logo) */
  function signageHeaderHTML() {
    return `
      <div class="tt-signage-header">
        <div class="tt-signage-header__bar">
          <div class="tt-signage-header__bar-logo">${signageBarLogoHTML('header')}</div>
          <div>
            <div class="tt-signage-header__bar-name">${barName}</div>
          </div>
        </div>
        ${logoHTML('sm')}
      </div>`;
  }

  /** Panel header for in-game signage */
  function signagePanelHeaderHTML() {
    return `
      <div class="tt-signage-panel__header">
        <div class="tt-signage-panel__bar-logo">${signageBarLogoHTML('panel')}</div>
        <div>
          <div class="tt-signage-panel__bar-name">${barName}</div>
        </div>
      </div>`;
  }

  /** Panel QR badge */
  function signagePanelQRHTML() {
    return `
      <div class="tt-signage-panel__qr">
        ${qrCodeHTML(88)}
        <div>
          <div class="tt-signage-panel__qr-text">Join Trivia!</div>
          <div class="tt-signage-panel__qr-url">play.taptrivia.tv</div>
          <div class="tt-signage-panel__qr-code-row">
            <span class="tt-signage-panel__qr-code-label">CODE</span>
            <span class="tt-signage-panel__qr-code">${barCode}</span>
          </div>
        </div>
      </div>`;
  }

  /** Get active signage slides filtered by day-of-week */
  function getActiveSlides() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    return signageSlides.filter(s => {
      if (!s.enabled) return false;
      const sDays = s.schedule && s.schedule.days;
      if (sDays && sDays.length > 0 && !sDays.includes(today)) return false;
      return true;
    });
  }

  /** Start signage rotation timer */
  function startSignageRotation() {
    stopSignageRotation();
    const active = getActiveSlides();
    if (active.length <= 1) return;
    signageRotationTimer = setInterval(() => {
      signageCurrentIndex = (signageCurrentIndex + 1) % getActiveSlides().length;
      // Re-render screens that display signage
      if (currentScreen === 'idle') {
        renderIdle();
      } else {
        // Update in-game signage panel in place
        updateSignagePanel();
      }
    }, signageRotationSpeed * 1000);
  }

  /** Stop signage rotation */
  function stopSignageRotation() {
    if (signageRotationTimer) {
      clearInterval(signageRotationTimer);
      signageRotationTimer = null;
    }
  }

  /** Ensure signage rotation is running when slides exist */
  function ensureSignageRotation() {
    const active = getActiveSlides();
    if (active.length > 1 && !signageRotationTimer) {
      startSignageRotation();
    }
  }

  /** Update the signage panel content in place (no full re-render) */
  function updateSignagePanel() {
    const panelEl = document.querySelector('.tt-signage-panel');
    if (!panelEl) return;
    const active = getActiveSlides();
    if (active.length === 0) return;
    const idx = signageCurrentIndex % active.length;
    const slide = active[idx];
    const renderer = SIGNAGE_PANEL[slide.template];
    if (!renderer) return;
    panelEl.innerHTML = renderer(slide.data || {});
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN ROTATION — cycle lobby/between/results during breaks
  // ═══════════════════════════════════════════════════════════════

  /** Cache a translated gameState for use in screen rotation */
  function cacheForRotation(gameState, apiState) {
    const screen = gameState.screen;
    cachedScreenData[screen] = { ...gameState };

    // Propagate nextGameStartEpoch to all cached states
    const nextEpoch = apiState.nextGameStartEpoch || gameState.nextGameStartEpoch;
    if (nextEpoch) {
      Object.keys(cachedScreenData).forEach(k => {
        if (cachedScreenData[k]) cachedScreenData[k].nextGameStartEpoch = nextEpoch;
      });
    }

    // During game_over, ensure a lobby state exists for rotation
    if (apiState.state === 'game_over' && !cachedScreenData.lobby) {
      cachedScreenData.lobby = {
        screen: 'lobby',
        playerCount: gameState.playerCount || 0,
        players: [],
        nextGameStartEpoch: nextEpoch,
      };
    }
  }

  /** Build ordered list of screens available for rotation */
  function buildRotationList() {
    const screens = [];
    if (cachedScreenData.lobby) screens.push('lobby');
    if (cachedScreenData.between) screens.push('between');
    if (cachedScreenData.results) screens.push('results');
    return screens;
  }

  /** Enter or continue screen rotation mode */
  function handleScreenRotation(currentGameState) {
    const newList = buildRotationList();

    if (!rotationActive) {
      rotationActive = true;
      rotationScreens = newList;
      rotationIdx = Math.max(0, newList.indexOf(currentGameState.screen));
      renderRotationScreen();
      startRotationTimer();
    } else {
      // Already rotating — update list, preserve position
      const current = rotationScreens[rotationIdx];
      rotationScreens = newList;
      const newIdx = newList.indexOf(current);
      rotationIdx = newIdx >= 0 ? newIdx : 0;
      updateCurrentRotatedScreen();
    }
  }

  /** Render the current rotation screen */
  function renderRotationScreen() {
    if (rotationScreens.length === 0) return;
    const screenName = rotationScreens[rotationIdx % rotationScreens.length];
    const state = cachedScreenData[screenName];
    if (!state) return;
    currentScreen = '';
    localQuestionNumber = null;
    renderScreen(state);
  }

  /** Surgical update for the currently displayed rotation screen */
  function updateCurrentRotatedScreen() {
    if (rotationScreens.length === 0) return;
    const screenName = rotationScreens[rotationIdx];
    const state = cachedScreenData[screenName];
    if (!state) return;
    if (currentScreen === 'lobby') updateLobbyCountdown(state);
    else if (currentScreen === 'results') updateResultsCountdown(state);
  }

  /** Start the screen rotation timer */
  function startRotationTimer() {
    stopRotationTimer();
    if (rotationScreens.length <= 1) return;
    rotationTimer = setInterval(() => {
      rotationIdx = (rotationIdx + 1) % rotationScreens.length;
      renderRotationScreen();
    }, ROTATION_INTERVAL_MS);
  }

  /** Stop the screen rotation timer */
  function stopRotationTimer() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  /** Exit rotation mode when active gameplay resumes */
  function exitRotationMode() {
    if (!rotationActive) return;
    rotationActive = false;
    stopRotationTimer();
    rotationScreens = [];
    rotationIdx = 0;
  }

  // --- Full-Screen Signage Renderers (7 templates, all at 2×) ---

  const SIGNAGE_FS = {
    specials(d) {
      const items = (d.menuItems || []).map(item => `
        <div class="tt-signage-menu-item">
          <span class="tt-signage-menu-item__icon">${item.icon || ''}</span>
          <div style="flex:1">
            <div class="tt-signage-menu-item__name">${item.name || ''}</div>
            <div class="tt-signage-menu-item__desc">${item.desc || ''}</div>
          </div>
          <div class="tt-signage-menu-item__price">${item.price || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-content">
            <div style="flex:1.1;display:flex;flex-direction:column;justify-content:center;padding:0 80px">
              <div class="tt-signage-label" style="color:#f59e0b">${d.emoji || ''} ${d.label || "Today's Specials"}</div>
              <div class="tt-signage-headline">${d.headline || ''}<br><span class="tt-signage-headline--gold">${d.subheadline || ''}</span></div>
              <div class="tt-signage-featured">
                <div>
                  <div class="tt-signage-featured__name">${d.featuredName || ''}</div>
                  <div class="tt-signage-featured__desc">${d.featuredDesc || ''}</div>
                </div>
                <div class="tt-signage-featured__price">${d.featuredPrice || ''}</div>
              </div>
            </div>
            <div style="flex:0.9;display:flex;flex-direction:column;justify-content:center;padding:0 72px 0 0;gap:24px">
              ${items}
            </div>
          </div>
          ${qrBadgeHTML('br')}
        </div>`;
    },

    happyhour(d) {
      const deals = (d.deals || []).map(deal => `
        <div class="tt-signage-deal">
          <div class="tt-signage-deal__value" style="color:${deal.color || '#f59e0b'}">${deal.deal || ''}</div>
          <div class="tt-signage-deal__item">${deal.item || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-label" style="color:#f59e0b;animation:neonPulse 2s ease-in-out infinite">${d.emoji || ''} Happy Hour</div>
            <div class="tt-signage-headline">${d.timeRange || ''}</div>
            <div class="tt-signage-subtitle">${d.frequency || ''}</div>
            <div class="tt-signage-deals">${deals}</div>
          </div>
          ${qrBadgeHTML('bl')}
        </div>`;
    },

    event(d) {
      const prizes = (d.prizes || []).map(p => `
        <div class="tt-signage-prize">
          <div class="tt-signage-prize__emoji">${p.emoji || ''}</div>
          <div class="tt-signage-prize__place">${p.place || ''}</div>
          <div class="tt-signage-prize__name">${p.prize || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-label" style="color:#667eea">${d.when || ''}</div>
            <div class="tt-signage-headline">${d.eventName || ''}</div>
            <div class="tt-signage-subtitle">${d.details || ''}</div>
            <div class="tt-signage-prizes">${prizes}</div>
          </div>
          ${qrBadgeHTML('bl')}
        </div>`;
    },

    brand(d) {
      const hours = (d.hours || []).map(h => `
        <div style="text-align:center">
          <div class="tt-signage-hours__label">${h.label || ''}</div>
          <div class="tt-signage-hours__value">${h.hours || ''}</div>
        </div>`).join('');
      const logoInner = barLogoUrl
        ? `<img src="${barLogoUrl}" alt="${barName}">`
        : `<span class="tt-signage-brand-logo__initial">${barName ? barName.charAt(0).toUpperCase() : 'B'}</span>`;
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          <div class="tt-signage-center">
            <div class="tt-signage-brand-logo">${logoInner}</div>
            <div class="tt-signage-headline">${barName}</div>
            <div class="tt-signage-subtitle" style="letter-spacing:4px;text-transform:uppercase;font-size:32px">${d.tagline || ''}</div>
            <div class="tt-signage-divider"></div>
            <div class="tt-signage-hours">${hours}</div>
          </div>
          <div class="tt-signage-powered">
            <div class="tt-signage-powered__inner">
              ${logoHTML('sm')}
              <div class="tt-signage-powered__sep"></div>
              <span class="tt-signage-powered__text">Powered by TapTrivia</span>
            </div>
          </div>
        </div>`;
    },

    announcement(d) {
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-headline">${d.headline || ''}</div>
            <div class="tt-signage-body">${d.message || ''}</div>
            ${d.subtext ? `<div class="tt-signage-subtext">${d.subtext}</div>` : ''}
          </div>
          ${qrBadgeHTML('bl')}
        </div>`;
    },

    sports(d) {
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-label" style="color:#ff4757">${d.headline || 'Game Day'}</div>
            <div class="tt-signage-headline">${d.matchup || ''}</div>
            <div class="tt-signage-subtitle">${d.when || ''}</div>
            <div class="tt-signage-promo">${d.promo || ''}</div>
            ${d.tagline ? `<div class="tt-signage-tagline">${d.tagline}</div>` : ''}
          </div>
          ${qrBadgeHTML('bl')}
        </div>`;
    },

    custom(d) {
      const items = (d.items || []).map(item => `
        <div class="tt-signage-item">
          <span class="tt-signage-item__emoji">${item.emoji || ''}</span>
          <span class="tt-signage-item__text">${item.text || ''}</span>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-headline">${d.headline || ''}</div>
            <div class="tt-signage-body">${d.body || ''}</div>
            ${items ? `<div class="tt-signage-items">${items}</div>` : ''}
          </div>
          ${qrBadgeHTML('bl')}
        </div>`;
    },
  };

  // --- In-Game Panel Renderers (7 templates, 680px at 2×) ---

  const SIGNAGE_PANEL = {
    specials(d) {
      const items = (d.menuItems || []).map(item => `
        <div class="tt-signage-panel__menu-item">
          <span class="tt-signage-panel__menu-icon">${item.icon || ''}</span>
          <div style="flex:1;min-width:0">
            <div class="tt-signage-panel__menu-name">${item.name || ''}</div>
            <div class="tt-signage-panel__menu-desc">${item.desc || ''}</div>
          </div>
          <div class="tt-signage-panel__menu-price">${item.price || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div class="tt-signage-panel__label" style="color:#f59e0b">${d.emoji || ''} ${d.label || "Tonight's Specials"}</div>
          <div class="tt-signage-panel__featured">
            <div>
              <div class="tt-signage-panel__featured-name">${d.featuredName || ''}</div>
              <div class="tt-signage-panel__featured-desc">${d.featuredDesc || ''}</div>
            </div>
            <div class="tt-signage-panel__featured-price">${d.featuredPrice || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;flex:1">${items}</div>
          ${signagePanelQRHTML()}
        </div>`;
    },

    happyhour(d) {
      const deals = (d.deals || []).map(deal => `
        <div class="tt-signage-panel__deal">
          <div class="tt-signage-panel__deal-value" style="color:${deal.color || '#f59e0b'}">${deal.deal || ''}</div>
          <div class="tt-signage-panel__deal-item">${deal.item || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div class="tt-signage-panel__label" style="color:#e879f9">${d.emoji || ''} Happy Hour</div>
          <div class="tt-signage-panel__headline">${d.timeRange || ''}</div>
          <div class="tt-signage-panel__subtitle">${d.frequency || ''}</div>
          <div style="display:flex;flex-direction:column;gap:16px;flex:1">${deals}</div>
          ${signagePanelQRHTML()}
        </div>`;
    },

    event(d) {
      const prizes = (d.prizes || []).map(p => `
        <div class="tt-signage-panel__prize">
          <span class="tt-signage-panel__prize-emoji">${p.emoji || ''}</span>
          <div style="flex:1;text-align:left">
            <div class="tt-signage-panel__prize-place">${p.place || ''}</div>
            <div class="tt-signage-panel__prize-name">${p.prize || ''}</div>
          </div>
        </div>`).join('');
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div class="tt-signage-panel__label" style="color:#667eea">${d.emoji || ''} Coming Up</div>
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
            <div class="tt-signage-panel__emoji">${d.emoji || ''}</div>
            <div class="tt-signage-panel__label" style="color:#667eea">${d.when || ''}</div>
            <div class="tt-signage-panel__headline">${d.eventName || ''}</div>
            <div class="tt-signage-panel__subtitle">${d.details || ''}</div>
            <div style="display:flex;flex-direction:column;gap:12px;width:100%;padding:0 12px">${prizes}</div>
          </div>
          ${signagePanelQRHTML()}
        </div>`;
    },

    brand(d) {
      const hours = (d.hours || []).map(h => `
        <div class="tt-signage-panel__hours-row">
          <span class="tt-signage-panel__hours-label">${h.label || ''}</span>
          <span class="tt-signage-panel__hours-value">${h.hours || ''}</span>
        </div>`).join('');
      const logoInner = barLogoUrl
        ? `<img src="${barLogoUrl}" alt="${barName}" style="width:100%;height:100%;object-fit:cover">`
        : `<span style="font-family:'Fredoka',sans-serif;font-size:48px;font-weight:800;color:#ffd200">${barName ? barName.charAt(0).toUpperCase() : 'B'}</span>`;
      return `
        <div class="tt-signage-panel__inner" style="align-items:center;justify-content:center;text-align:center">
          <div class="tt-signage-brand-logo" style="width:160px;height:160px;border-radius:32px;margin-bottom:28px">${logoInner}</div>
          <div class="tt-signage-panel__headline">${barName}</div>
          <div class="tt-signage-panel__subtitle" style="letter-spacing:2px;text-transform:uppercase;font-size:20px">${d.tagline || ''}</div>
          <div class="tt-signage-divider" style="width:80px;height:4px;margin:24px auto"></div>
          <div style="width:100%">${hours}</div>
          <div style="margin-top:auto">${signagePanelQRHTML()}</div>
        </div>`;
    },

    announcement(d) {
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
            <div class="tt-signage-panel__emoji">${d.emoji || ''}</div>
            <div class="tt-signage-panel__headline">${d.headline || ''}</div>
            <div class="tt-signage-panel__body">${d.message || ''}</div>
            ${d.subtext ? `<div class="tt-signage-panel__muted">${d.subtext}</div>` : ''}
          </div>
          ${signagePanelQRHTML()}
        </div>`;
    },

    sports(d) {
      return `
        <div class="tt-signage-panel__inner" style="text-align:center">
          ${signagePanelHeaderHTML()}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center">
            <div class="tt-signage-panel__emoji">${d.emoji || ''}</div>
            <div class="tt-signage-panel__label" style="color:#ff4757">${d.headline || 'Game Day'}</div>
            <div class="tt-signage-panel__headline">${d.matchup || ''}</div>
            <div class="tt-signage-panel__subtitle">${d.when || ''}</div>
            <div class="tt-signage-panel__promo">${d.promo || ''}</div>
            ${d.tagline ? `<div class="tt-signage-panel__muted" style="font-style:italic">${d.tagline}</div>` : ''}
          </div>
          ${signagePanelQRHTML()}
        </div>`;
    },

    custom(d) {
      const items = (d.items || []).map(item => `
        <div class="tt-signage-panel__item">
          <span class="tt-signage-panel__item-emoji">${item.emoji || ''}</span>
          <span class="tt-signage-panel__item-text">${item.text || ''}</span>
        </div>`).join('');
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
            <div class="tt-signage-panel__emoji">${d.emoji || ''}</div>
            <div class="tt-signage-panel__headline">${d.headline || ''}</div>
            <div class="tt-signage-panel__body">${d.body || ''}</div>
            ${items ? `<div style="display:flex;flex-direction:column;gap:10px;width:100%;padding:0 8px">${items}</div>` : ''}
          </div>
          ${signagePanelQRHTML()}
        </div>`;
    },
  };

  /** Render a full-screen signage slide */
  function renderSignageFullScreen(slide) {
    const renderer = SIGNAGE_FS[slide.template];
    if (!renderer) return null;
    return renderer(slide.data || {});
  }

  /** Get signage panel HTML with divider for in-game screens */
  function signagePanelWrapHTML() {
    const active = getActiveSlides();
    console.log('[Signage panel] active:', active.length, 'total:', signageSlides.length, 'screen:', currentScreen);
    if (active.length === 0) return '';
    const idx = signageCurrentIndex % active.length;
    const slide = active[idx];
    const renderer = SIGNAGE_PANEL[slide.template];
    if (!renderer) {
      console.warn('[Signage panel] No renderer for template:', slide.template);
      return '';
    }
    return `
      <div class="tt-signage-panel-divider"></div>
      <div class="tt-signage-panel">
        ${renderer(slide.data || {})}
      </div>`;
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
      if (screen === 'between') { updateBetweenCountdown(gameState); return; }
      if (screen === 'results') { updateResultsCountdown(gameState); return; }
      if (screen === 'lobby') { updateLobbyCountdown(gameState); return; }
      return; // All other screens: static, no update needed
    }

    // Stop local clock when leaving playing screen
    if (currentScreen === 'playing' && screen !== 'playing') stopLocalClock();

    currentScreen = screen;
    localQuestionNumber = qNum;

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

  /** IDLE / ATTRACT SCREEN — shows signage slides when available */
  function renderIdle() {
    const active = getActiveSlides();
    if (active.length > 0) {
      const idx = signageCurrentIndex % active.length;
      const html = renderSignageFullScreen(active[idx]);
      if (html) {
        screenEl.innerHTML = html;
        if (!signageRotationTimer && active.length > 1) startSignageRotation();
        return;
      }
    }
    stopSignageRotation();
    screenEl.innerHTML = `
      <div class="tt-idle">
        <div class="tt-idle__logo">${logoHTML('xl')}</div>
        ${barNameHTML('xl')}
        <div class="tt-idle__cta">Live trivia every 15 minutes!</div>
        <div class="tt-idle__sub">Scan the QR code to play on your phone</div>
      </div>`;
  }

  /** SETUP SCREEN — bar registration or join with existing code */
  function renderSetup() {
    screenEl.innerHTML = `
      <div class="tt-setup">
        ${logoHTML('xl')}
        <div class="tt-setup__subtitle">Register Your Bar</div>
        <input type="text" id="tt-setup-input" class="tt-setup__input" placeholder="Murphy's Pub" maxlength="50" autocomplete="off" aria-label="Bar name">
        <input type="email" id="tt-setup-email" class="tt-setup__input tt-setup__input--email" placeholder="owner@email.com (optional)" maxlength="100" autocomplete="off" aria-label="Owner email">
        <button id="tt-setup-btn" class="tt-setup__btn">GET YOUR BAR CODE</button>
        <div class="tt-setup__divider"><span>or</span></div>
        <div class="tt-setup__subtitle">Already have a bar code?</div>
        <input type="text" id="tt-setup-code" class="tt-setup__input tt-setup__input--code" placeholder="ABC12" maxlength="5" autocomplete="off" aria-label="Bar code" style="text-transform:uppercase;letter-spacing:8px">
        <button id="tt-setup-join-btn" class="tt-setup__btn tt-setup__btn--join">JOIN WITH CODE</button>
        <div class="tt-setup__hint">Use your TV remote or USB keyboard to type.</div>
      </div>`;
    // Bind events — register flow
    const input = document.getElementById('tt-setup-input');
    const emailInput = document.getElementById('tt-setup-email');
    const btn = document.getElementById('tt-setup-btn');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') emailInput.focus(); });
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') registerBar(); });
    btn.addEventListener('click', registerBar);
    // Bind events — join with code flow
    const codeInput = document.getElementById('tt-setup-code');
    const joinBtn = document.getElementById('tt-setup-join-btn');
    codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase(); });
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinWithCode(); });
    joinBtn.addEventListener('click', joinWithCode);
    input.focus();
  }

  /** LOBBY SCREEN — v4 lines 492-521 */
  function renderLobby(state) {
    const players = state.players || [];
    const count = state.playerCount || players.length || 0;
    const panel = signagePanelWrapHTML();

    let playerGrid = '';
    players.forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      playerGrid += `
        <div class="tt-lobby__player" style="animation:popIn .3s ease-out ${i * 0.05}s both">
          ${avatarHTML(name, { size: 'lg' })}
          <span class="tt-lobby__player-name">${name}</span>
        </div>`;
    });

    // Countdown to next game
    let countdownHTML = '';
    if (state.nextGameStartEpoch) {
      const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
      if (secsLeft > 0) {
        const mins = Math.floor(secsLeft / 60);
        const secs = secsLeft % 60;
        const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
        countdownHTML = `
          <div class="tt-lobby__countdown">
            <span class="tt-lobby__countdown-label">Next game in</span>
            <span class="tt-lobby__countdown-num" id="tv-lobby-countdown">${display}</span>
          </div>`;
      }
    }
    if (!countdownHTML) {
      countdownHTML = `
        <div class="tt-lobby__waiting">
          <span class="tt-lobby__waiting-text">Waiting for host</span>
          ${waitingDotsHTML()}
        </div>`;
    }

    screenEl.innerHTML = `
      <div class="tt-lobby${panel ? ' tt-lobby--with-panel' : ''}">
        ${countdownHTML}
        <div class="tt-lobby__left">
          <div class="tt-lobby__logo">${logoHTML('xl')}</div>
          ${barNameHTML('lg')}
          <div class="tt-lobby__subtitle">Scan to join or enter code below</div>
          ${qrCodeHTML(360)}
          <div class="tt-lobby__code-section">
            <div class="tt-lobby__code-label">Or Enter Code</div>
            <div class="tt-lobby__code">${barCode}</div>
            <div class="tt-lobby__url">play.taptrivia.tv</div>
          </div>
        </div>
        <div class="tt-lobby__right">
          <div class="tt-lobby__player-label">${count} Players Ready</div>
          <div class="tt-lobby__player-grid">${playerGrid}</div>
        </div>
        ${panel}
      </div>`;
    if (panel) ensureSignageRotation();
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
      else if (correctIdx !== undefined) ansState = 'dimmed';
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

  /** BETWEEN QUESTIONS / SCOREBOARD FLASH — left-half + optional signage panel */
  function renderBetween(state) {
    const scores = state.scores || [];
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    const nextIn = state.nextQuestionIn || 5;
    const isLastQuestion = num >= totalQ;
    const panel = signagePanelWrapHTML();

    let countdownLine = '';
    if (rotationActive) {
      // During screen rotation, no game-clock countdown — show next game countdown if available
      if (state.nextGameStartEpoch) {
        const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
        if (secsLeft > 0) {
          const mins = Math.floor(secsLeft / 60);
          const secs = secsLeft % 60;
          const display = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
          countdownLine = `<div class="tt-between__next">Next game in ${display}</div>`;
        }
      }
    } else {
      const countdownText = isLastQuestion
        ? 'Final results coming...'
        : `Next question in <span class="tt-between__countdown-num">${nextIn}</span>s...`;
      countdownLine = `<div id="tv-between-countdown" class="tt-between__next">${countdownText}</div>`;
    }

    // Full-width glass bar rows for standings
    let standingsHTML = '';
    scores.slice(0, 5).forEach((p, i) => {
      const rank = i + 1;
      const name = p.name || p.playerName || 'Player';
      const score = p.score || 0;
      standingsHTML += `
        <div class="tt-standing-row" style="animation:rankSlide .3s ease-out ${i * 0.06}s both">
          <span class="tt-standing-row__rank">${rank}</span>
          ${avatarHTML(name, { size: 'sm' })}
          <span class="tt-standing-row__name">${name}</span>
          <span class="tt-standing-row__score">${score.toLocaleString()}</span>
        </div>`;
    });

    screenEl.innerHTML = `
      <div class="tt-between tt-between--half${panel ? ' tt-between--with-panel' : ''}">
        <div class="tt-between__panel">
          ${logoHTML('sm')}
          ${barNameHTML('md')}
          <div class="tt-between__section-label">Standings</div>
          <div class="tt-between__standings">${standingsHTML}</div>
          ${countdownLine}
        </div>
        ${panel}
      </div>`;
    if (panel) ensureSignageRotation();
  }

  /** LEADERBOARD SCREEN — v4 lines 598-637 + signage panel */
  function renderLeaderboard(state) {
    const scores = state.scores || [];
    const num = state.questionNumber || 1;
    const panel = signagePanelWrapHTML();

    if (panel) {
      // With signage: compact left side (podium + 4th/5th) + signage panel right
      const runners = scores.slice(3, 5);
      let runnersHTML = '';
      if (runners.length > 0) {
        runnersHTML = '<div style="display:flex;gap:20px;width:100%;max-width:760px;padding:0 16px;margin-top:8px">';
        runners.forEach((p, i) => {
          const name = p.name || p.playerName || 'Player';
          runnersHTML += `
            <div style="flex:1;display:flex;align-items:center;gap:12px;padding:12px 20px;background:rgba(255,255,255,.04);border-radius:16px;border:1px solid rgba(255,255,255,.04)">
              <span style="font-family:'Fredoka',sans-serif;font-size:24px;font-weight:700;color:rgba(255,255,255,.25);width:28px">${i + 4}</span>
              ${avatarHTML(name, { size: 'xs' })}
              <span style="flex:1;font-size:20px;font-weight:500;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
              <span style="font-family:'Fredoka',sans-serif;font-size:20px;font-weight:700;color:#ffd200">${(p.score || 0).toLocaleString()}</span>
            </div>`;
        });
        runnersHTML += '</div>';
      }
      screenEl.innerHTML = `
        <div class="tt-leaderboard tt-leaderboard--with-panel">
          <div class="tt-leaderboard__left">
            ${logoHTML('md')}
            ${barNameHTML('lg')}
            <div class="tt-leaderboard__after">After Question ${num}</div>
            ${podiumHTML(scores)}
            ${runnersHTML}
            <div class="tt-leaderboard__next">Next question in 5s...</div>
          </div>
          ${panel}
        </div>`;
    } else {
      // No signage: original layout with Top 10 sidebar
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
    if (panel) ensureSignageRotation();
  }

  /** RESULTS / GAME OVER SCREEN — podium top 3 + 4th/5th runners + signage panel */
  function renderResults(state) {
    const scores = state.scores || [];
    const totalQ = state.totalQuestions || 15;
    const playerCount = state.playerCount || scores.length;
    const panel = signagePanelWrapHTML();

    // Podium: top 3, display order 2nd → 1st → 3rd
    const top3 = scores.slice(0, 3);
    const podiumOrder = [top3[1] || null, top3[0] || null, top3[2] || null];
    const podiumRanks = [2, 1, 3];
    const podiumSizes = ['lg', 'xl', 'lg'];
    let podiumInner = '';
    podiumOrder.forEach((p, i) => {
      if (!p) return;
      const rank = podiumRanks[i];
      const name = p.name || p.playerName || 'Player';
      const score = p.score || 0;
      const isFirst = rank === 1;
      podiumInner += `
        <div class="tt-results__podium-place${isFirst ? ' tt-results__podium-place--first' : ''}" style="animation:slideUp .5s ease-out ${i * 0.1}s both">
          <div style="animation:medalDrop .5s ease-out ${i * 0.15 + 0.3}s both">
            ${avatarHTML(name, { rank, size: podiumSizes[i] })}
          </div>
          <div class="tt-results__podium-name${isFirst ? ' tt-results__podium-name--first' : ''}">${name}</div>
          <div class="tt-results__podium-score${isFirst ? ' tt-results__podium-score--first' : ''}">${score.toLocaleString()}</div>
        </div>`;
    });

    // 4th and 5th place compact runner cards
    const runners = scores.slice(3, 5);
    let runnersHTML = '';
    if (runners.length > 0) {
      runnersHTML = '<div class="tt-results__runners">';
      runners.forEach((p, i) => {
        const name = p.name || p.playerName || 'Player';
        const score = p.score || 0;
        runnersHTML += `
          <div class="tt-results__runner">
            <span class="tt-results__runner-rank">${i + 4}</span>
            ${avatarHTML(name, { size: 'sm' })}
            <span class="tt-results__runner-name">${name}</span>
            <span class="tt-results__runner-score">${score.toLocaleString()}</span>
          </div>`;
      });
      runnersHTML += '</div>';
    }

    // Next game text
    let nextText = 'Next game starts soon — stay tuned!';
    if (state.nextGameStartEpoch) {
      const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
      if (secsLeft > 0 && secsLeft <= 120) {
        nextText = `Next game in <span class="tt-results__countdown-num">${secsLeft}</span>s`;
      }
    }

    screenEl.innerHTML = `
      <div class="tt-results tt-results--half${panel ? ' tt-results--with-panel' : ''}">
        <div class="tt-results__panel">
          <div class="tt-results__trophy">🏆</div>
          <div class="tt-results__title">Game Over!</div>
          <div class="tt-results__subtitle">${totalQ} questions · ${playerCount} players</div>
          <div class="tt-results__podium">${podiumInner}</div>
          ${runnersHTML}
          <div class="tt-results__next-text" id="tv-results-next">${nextText}</div>
        </div>
        ${panel}
      </div>`;
    if (panel) ensureSignageRotation();
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

  function updateResultsCountdown(state) {
    const wrap = document.getElementById('tv-results-next');
    if (!wrap) return;
    if (state.nextGameStartEpoch) {
      const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
      if (secsLeft > 0 && secsLeft <= 120) {
        wrap.innerHTML = `Next game in <span class="tt-results__countdown-num">${secsLeft}</span>s`;
      } else {
        wrap.textContent = 'Next game starts soon — stay tuned!';
      }
    }
  }

  function updateLobbyCountdown(state) {
    const el = document.getElementById('tv-lobby-countdown');
    if (!el && state.nextGameStartEpoch) {
      // Countdown element doesn't exist yet — re-render
      const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
      if (secsLeft > 0) {
        currentScreen = ''; // Force full re-render
        renderScreen(state);
      }
      return;
    }
    if (el && state.nextGameStartEpoch) {
      const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - Date.now()) / 1000));
      const mins = Math.floor(secsLeft / 60);
      const secs = secsLeft % 60;
      el.textContent = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
    }
  }

  function updateBetweenCountdown(state) {
    const el = document.getElementById('tv-between-countdown');
    if (!el) return;
    const nextIn = state.nextQuestionIn || 5;
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    if (num >= totalQ) {
      el.innerHTML = 'Final results coming...';
    } else {
      el.innerHTML = `Next question in <span class="tt-between__countdown-num">${nextIn}</span>s...`;
    }
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
    const TIMER_TOTAL = 44;

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
    const emailInput = document.getElementById('tt-setup-email');
    const btn = document.getElementById('tt-setup-btn');
    const name = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); return; }

    const ownerEmail = emailInput ? emailInput.value.trim() : '';

    if (btn) { btn.textContent = 'REGISTERING...'; btn.disabled = true; }

    const payload = { barName: name, tvDeviceId };
    if (ownerEmail) payload.ownerEmail = ownerEmail;
    const result = await apiCall('POST', '/bar/register', payload);
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

  async function joinWithCode() {
    const codeInput = document.getElementById('tt-setup-code');
    const joinBtn = document.getElementById('tt-setup-join-btn');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if (!code) { if (codeInput) codeInput.focus(); return; }

    if (joinBtn) { joinBtn.textContent = 'JOINING...'; joinBtn.disabled = true; }

    const bar = await apiCall('GET', `/bar/${code}`);
    if (bar.error || bar.status !== 'active') {
      if (joinBtn) { joinBtn.textContent = 'JOIN WITH CODE'; joinBtn.disabled = false; }
      if (codeInput) {
        codeInput.value = '';
        codeInput.placeholder = 'Not found — try again';
        codeInput.focus();
      }
      return;
    }

    barCode = bar.barCode;
    barName = bar.barName;
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

    // Capture signage configuration
    if (state.signage) {
      signageSlides = state.signage.slides || [];
      signageRotationSpeed = state.signage.rotationSpeed || 15;
      console.log('[Signage] Loaded', signageSlides.length, 'slides from API, speed:', signageRotationSpeed);
    } else {
      console.log('[Signage] No signage in response, state:', state.state, 'keeping', signageSlides.length, 'cached slides');
    }

    // Update logo if hash changed (avoids redundant downloads)
    if (state.logoHash && state.logoHash !== barLogoHash) {
      barLogoHash = state.logoHash;
      barLogoUrl = state.logoUrl || null;
    }

    // Capture gameStartEpoch for local clock
    if (state.gameStartEpoch) {
      localGameStartEpoch = state.gameStartEpoch;
    }

    const gameState = translateApiState(state);
    if (state.phase) console.log('[TV poll] phase:', state.phase, '→ screen:', gameState.screen, 'q:', gameState.questionNumber);

    // Cache for screen rotation
    cacheForRotation(gameState, state);

    // During break, cycle through lobby/between/results
    // (game_over and active_game render normally — rotation only during breaks)
    if (state.state === 'break') {
      handleScreenRotation(gameState);
      return;
    }

    // Active game or game_over — exit rotation, render normally
    exitRotationMode();
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
      gs.nextGameStartEpoch = apiState.nextGameStartEpoch || null;
      gs.secondsUntilNextGame = apiState.secondsUntilNextGame || null;
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
      } else if (phase === 'between') {
        gs.screen = 'leaderboard';
      } else if (phase === 'reveal') {
        gs.screen = 'reveal';
        gs.question = {
          text: apiState.question,
          answers: (apiState.answers || []).map((a, i) => ({ id: i, text: a })),
          category: apiState.category,
          categoryIcon: getCategoryIcon(apiState.category),
        };
        gs.correctAnswerIndex = apiState.correctIndex !== undefined && apiState.correctIndex !== null
          ? apiState.correctIndex
          : (apiState.answers ? apiState.answers.indexOf(apiState.correctAnswer) : -1);
        gs.answerPercentages = apiState.answerPercentages || [];
        gs.pctCorrect = apiState.pctCorrect;
        gs.avgAnswerTimeSec = apiState.avgAnswerTimeSec;
      } else if (phase === 'scores') {
        gs.screen = 'between';
        const elapsed = apiState.elapsedSeconds || 49;
        gs.nextQuestionIn = Math.max(1, Math.ceil(QUESTION_DURATION_MS / 1000 - elapsed));
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
        const remaining = Math.max(0, 49 - elapsed);
        gs.timer = { remaining, total: 44 };
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
      gs.secondsUntilNextGame = apiState.secondsUntilNextGame || null;
      gs.nextGameStartEpoch = apiState.nextGameStartEpoch || null;
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
      screen: 'between',
      questionNumber: 7,
      totalQuestions: 15,
      nextQuestionIn: 8,
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
