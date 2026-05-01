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

  // localStorage migration: read new key first, fall back to legacy keys
  function loadTvConfig() {
    const stored = localStorage.getItem('taptrivia_tv_config');
    if (stored) {
      try {
        const cfg = JSON.parse(stored);
        return { barCode: cfg.barCode || '', barName: cfg.barName || '', tvDeviceId: cfg.tvDeviceId || '' };
      } catch { /* fall through */ }
    }
    // Fall back to legacy keys
    return {
      barCode: localStorage.getItem('tt_bar_code') || '',
      barName: localStorage.getItem('tt_bar_name') || '',
      tvDeviceId: localStorage.getItem('tt_tv_device_id') || ''
    };
  }

  function saveTvConfig() {
    // Write both formats for backward compat
    localStorage.setItem('taptrivia_tv_config', JSON.stringify({ barCode, barName, tvDeviceId }));
    localStorage.setItem('tt_bar_code', barCode);
    localStorage.setItem('tt_bar_name', barName);
    localStorage.setItem('tt_tv_device_id', tvDeviceId);
  }

  const initialConfig = loadTvConfig();
  let barCode = initialConfig.barCode;
  let barName = initialConfig.barName;
  let tvDeviceId = initialConfig.tvDeviceId;

  // Setup screen state
  let setupRegState = 'form';    // form | sending | sent
  let setupCodeState = 'input';  // input | verifying | activated | error
  let setupCode = ['', '', '', '', ''];
  let setupCodeAutoFilled = false;
  let setupLocName = '';
  let setupEmail = '';
  let currentScreen = '';
  let pollInterval = null;
  let preGameWakeupTimer = null;
  const tvPlatform = new URLSearchParams(window.location.search).get('platform') || '';
  // Canonical analytics platform value: maps the existing setup-screen
  // platform names to the spec's enum (firetv | firetv_vega | vizio | web).
  // tvPlatform itself stays raw so platformInstructionsHTML keeps working.
  const _platformAnalyticsMap = {
    firestickvega: 'firetv_vega',
    firestickclassic: 'firetv',
    firetv: 'firetv',
    firetv_vega: 'firetv_vega',
    vizio: 'vizio'
  };
  const tvPlatformAnalytics = _platformAnalyticsMap[tvPlatform] || (tvPlatform ? tvPlatform : 'web');
  let platformModalDismissed = false;

  // Keep-alive for Fire TV Vega: play a tiny silent video to prevent screensaver.
  // The idle manager only inhibits screensaver during active media playback.
  // silence.mp4 is 16KB, cached for 1 year by CloudFront after first load.
  if (tvPlatform === 'firestickvega') {
    (function initKeepAlive() {
      try {
        // Wake Lock API (Chromium 84+)
        if ('wakeLock' in navigator) {
          navigator.wakeLock.request('screen').then(function(lock) {
            lock.addEventListener('release', function() { setTimeout(function() { navigator.wakeLock.request('screen').catch(function(){}); }, 1000); });
          }).catch(function(){});
          document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').catch(function(){});
          });
        }
      } catch(e) {}

      // Silent looping video — engages Chromium's media pipeline
      var v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;
      v.volume = 0;
      v.loop = true;
      v.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
      v.src = 'silence.mp4';
      document.body.appendChild(v);
      function tryPlay() { v.play().catch(function(){}); }
      v.addEventListener('canplay', tryPlay);
      v.addEventListener('pause', function() { setTimeout(tryPlay, 1000); });
      v.addEventListener('error', function() { setTimeout(function() { v.load(); tryPlay(); }, 3000); });
      // Retry play periodically in case autoplay was blocked
      setInterval(function() { if (v.paused) tryPlay(); }, 10000);
      tryPlay();

      // Media Session API
      try {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({ title: 'TapTrivia TV', artist: 'TapTrivia' });
          navigator.mediaSession.playbackState = 'playing';
          setInterval(function() { try { navigator.mediaSession.playbackState = 'playing'; } catch(e) {} }, 30000);
        }
      } catch(e) {}
    })();
  }
  let consecutiveErrors = 0;
  const MAX_ERRORS_BEFORE_OVERLAY = 3;

  // Local clock state for smooth animation (mirrors player-app approach)
  let localGameStartEpoch = null;
  let localQuestionNumber = null;
  let rafId = null;

  // Signage state
  let signageSlides = [];
  let signageRotationSpeed = 60;
  let signageCurrentIndex = 0;
  let signageRotationTimer = null;

  // Latest tv-state response — read by the impression logger so it can
  // attach concurrent_players + game_id to each event.
  let lastApiState = null;
  let lastLoggedSlideKey = '';
  let barLogoUrl = null;
  let barLogoHash = null;

  // Screen rotation state (cycles results/lobby after game ends)
  let cachedScreenData = {};
  let rotationActive = false;
  let rotationScreens = [];
  let rotationIdx = 0;
  let rotationTimer = null;
  let countdownTickTimer = null;
  const ROTATION_DURATIONS = { results: 60000, idle: 60000, lobby: 60000 };

  // Idle countdown tick — updates signage header countdown every second
  let idleCountdownTimer = null;
  let nextGameStartEpochCached = 0;

  // Between-game experience state
  let betweenGameData = null;
  let betweenGameActive = false;
  let betweenGamePhases = [];
  let betweenGamePhaseIdx = 0;
  let betweenGameTimer = null;
  let betweenGameCountdownTimer = null;
  let betweenGameStartEpoch = null;
  let betweenGameTotalDuration = 120000; // 120s total
  let betweenGameLastGameId = null;

  // DOM refs
  const screenEl = document.getElementById('tt-screen');
  const errorOverlay = document.getElementById('tt-error-overlay');

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /** Get next game start time that's always in the future (client-side, like player-app) */
  function getNextFutureGameTime(stateEpoch) {
    const SLOT_MS = 15 * 60 * 1000;
    const now = getServerNow();
    let nextEpoch = stateEpoch && stateEpoch > now ? stateEpoch : getNextGameTime(now);
    while (nextEpoch <= now) nextEpoch += SLOT_MS;
    return nextEpoch;
  }

  /** Format seconds into human-readable countdown (e.g., "10h 5m", "3m 22s", "15s") */
  function formatCountdown(secsLeft) {
    const hours = Math.floor(secsLeft / 3600);
    const mins = Math.floor((secsLeft % 3600) / 60);
    const secs = secsLeft % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

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

  /** Reset arrow — subtle top-right button to return to setup */
  function resetArrowHTML() {
    return `<button class="tt-reset-arrow" id="tt-reset-arrow" title="Change location" aria-label="Back to setup">←</button>`;
  }

  function bindResetArrow() {
    const btn = document.getElementById('tt-reset-arrow');
    if (btn) {
      btn.addEventListener('click', () => {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        exitRotationMode();
        stopSignageRotation();
        // Pre-fill code boxes with current bar code so user can re-activate quickly
        const prevCode = barCode || '';
        setupRegState = 'form';
        setupCodeState = 'input';
        setupCode = prevCode.length === 5
          ? prevCode.split('')
          : ['', '', '', '', ''];
        setupCodeAutoFilled = prevCode.length === 5;
        setupLocName = '';
        setupEmail = '';
        barCode = '';
        barName = '';
        saveTvConfig();
        currentScreen = '';
        renderScreen({ screen: 'setup' });
      });
    }
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

  /** Build real QR code SVG pointing to app.taptrivia.tv */
  function qrCodeHTML(size, cssClass = '') {
    const url = 'https://app.taptrivia.tv';
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
          <div class="tt-qr-badge__url">app.taptrivia.tv</div>
          <div class="tt-qr-badge__code-row">
            <span class="tt-qr-badge__code-label">JOIN</span>
            <span class="tt-qr-badge__code">${barCode}</span>
          </div>
        </div>
      </div>`;
  }

  /** Build QR badge for between-game screens — custom CTA text */
  function betweenQRBadgeHTML(title = 'Play Next Round!') {
    return `
      <div class="tt-qr-badge tt-qr-badge--br">
        ${qrCodeHTML(120)}
        <div class="tt-qr-badge__info">
          <div class="tt-qr-badge__title">${title}</div>
          <div class="tt-qr-badge__url">app.taptrivia.tv</div>
          <div class="tt-qr-badge__code-row">
            <span class="tt-qr-badge__code-label">CODE</span>
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
          <div style="font-size:26px;font-weight:600;color:#ffd200;margin-top:6px">app.taptrivia.tv</div>
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
  function difficultyHTML(level) {
    const clamped = Math.min(Math.max(level, 1), 3);
    const labels = ['', 'Easy', 'Medium', 'Hard'];
    let html = '<div class="tt-difficulty">';
    for (let i = 1; i <= clamped; i++) {
      html += '<div class="tt-difficulty__dot tt-difficulty__dot--active"></div>';
    }
    html += `<span class="tt-difficulty__label">${labels[clamped]}</span>`;
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
        // Empty slot — just a spacer, no pedestal bar
        html += `<div class="tt-podium__place tt-podium__place--empty" style="visibility:hidden"></div>`;
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

  /** Location logo HTML for signage contexts */
  function signageBarLogoHTML(context) {
    if (barLogoUrl) {
      return `<img src="${barLogoUrl}" alt="${barName}">`;
    }
    const initial = barName ? barName.charAt(0).toUpperCase() : 'B';
    const cls = context === 'panel' ? 'tt-signage-panel__bar-initial' : 'tt-signage-header__bar-initial';
    return `<span class="${cls}">${initial}</span>`;
  }

  /** Get minutes until the next game starts using reliable Intl ET conversion */
  function minutesUntilNextGame() {
    var WINDOW_START = 600;  // 10:00 AM ET in minutes
    var WINDOW_END = 1260;   // 9:00 PM ET in minutes
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date());
    var h = 0, m = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === 'hour') h = parseInt(parts[i].value, 10);
      if (parts[i].type === 'minute') m = parseInt(parts[i].value, 10);
    }
    // Intl hour12:false returns 24 for midnight in some browsers
    if (h === 24) h = 0;
    var nowMin = h * 60 + m;
    if (nowMin < WINDOW_START) return WINDOW_START - nowMin;
    if (nowMin >= WINDOW_END) return (1440 - nowMin) + WINDOW_START;
    return 15 - (nowMin - WINDOW_START) % 15;
  }

  /** Compute seconds-accurate countdown text from a future epoch (or fall back to minutesUntilNextGame) */
  function countdownTextFromEpoch(epoch) {
    var secsLeft;
    if (epoch && epoch > 0) {
      secsLeft = Math.max(0, Math.ceil((epoch - getServerNow()) / 1000));
    } else {
      secsLeft = minutesUntilNextGame() * 60;
    }
    var hours = Math.floor(secsLeft / 3600);
    var mins = Math.floor((secsLeft % 3600) / 60);
    var secs = secsLeft % 60;
    if (hours > 0) {
      return hours + '<span class="tt-signage-header__countdown-unit">h</span> ' +
             mins + '<span class="tt-signage-header__countdown-unit">m</span>';
    }
    if (mins > 0) {
      return mins + '<span class="tt-signage-header__countdown-unit">m</span> ' +
             String(secs).padStart(2, '0') + '<span class="tt-signage-header__countdown-unit">s</span>';
    }
    return secs + '<span class="tt-signage-header__countdown-unit">s</span>';
  }

  /** Full-screen signage header (location logo + name + countdown + TapTrivia logo) */
  function signageHeaderHTML() {
    const countdownText = countdownTextFromEpoch(nextGameStartEpochCached);
    return `
      <div class="tt-signage-header">
        <div class="tt-signage-header__bar">
          <div class="tt-signage-header__bar-logo">${signageBarLogoHTML('header')}</div>
          <div>
            <div class="tt-signage-header__bar-name">${barName}</div>
          </div>
        </div>
        <div class="tt-signage-header__right">
          <div class="tt-signage-header__countdown">
            <div class="tt-signage-header__countdown-label">Trivia starts in</div>
            <div class="tt-signage-header__countdown-value" id="signage-countdown-value">${countdownText}</div>
          </div>
          <div class="tt-signage-header__divider"></div>
          ${logoHTML('sm')}
        </div>
      </div>`;
  }

  /** 1-second tick that updates the signage header countdown in-place (no re-render) */
  function startIdleCountdownTick() {
    stopIdleCountdownTick();
    idleCountdownTimer = setInterval(() => {
      const el = document.getElementById('signage-countdown-value');
      if (!el) return;
      el.innerHTML = countdownTextFromEpoch(nextGameStartEpochCached);
    }, 1000);
  }
  function stopIdleCountdownTick() {
    if (idleCountdownTimer) { clearInterval(idleCountdownTimer); idleCountdownTimer = null; }
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
          <div class="tt-signage-panel__qr-url">app.taptrivia.tv</div>
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

  /** Crossfade via overlay: fade cover in → swap content → fade cover out */
  let fadeTimeout = null;
  function fadeScreenTransition(renderFn) {
    if (fadeTimeout) { clearTimeout(fadeTimeout); fadeTimeout = null; }
    let cover = document.getElementById('tt-fade-cover');
    if (!cover) {
      cover = document.createElement('div');
      cover.id = 'tt-fade-cover';
      cover.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0f0326;z-index:9999;opacity:0;pointer-events:none;transition:opacity 0.5s ease';
      document.body.appendChild(cover);
    }
    cover.style.opacity = '1';
    fadeTimeout = setTimeout(() => {
      fadeTimeout = null;
      renderFn();
      cover.style.opacity = '0';
    }, 550);
  }

  /** Start signage rotation timer */
  function startSignageRotation(speedOverride) {
    stopSignageRotation();
    let active = getActiveSlides();
    const usingDefaults = active.length === 0;
    if (usingDefaults) active = getDefaultSignageSlides();
    if (active.length <= 1) return;
    const speed = speedOverride || (usingDefaults ? 60 : signageRotationSpeed);
    signageRotationTimer = setInterval(() => {
      let slides = getActiveSlides();
      if (slides.length === 0) slides = getDefaultSignageSlides();
      signageCurrentIndex = (signageCurrentIndex + 1) % slides.length;
      lastLoggedSlideKey = ''; // index changed — let the next render log it
      if (currentScreen === 'idle') {
        fadeScreenTransition(() => { renderIdle(); logSignageImpressionIfNew(); });
      } else {
        updateSignagePanel();
        logSignageImpressionIfNew();
      }
    }, speed * 1000);
  }

  /** Stop signage rotation */
  function stopSignageRotation() {
    if (signageRotationTimer) {
      clearInterval(signageRotationTimer);
      signageRotationTimer = null;
    }
  }

  /** Ensure signage rotation is running when slides exist (custom or defaults) */
  function ensureSignageRotation() {
    let active = getActiveSlides();
    if (active.length === 0) active = getDefaultSignageSlides();
    if (active.length > 1 && !signageRotationTimer) {
      startSignageRotation();
    }
  }

  /** Update the signage panel content in place (no full re-render) */
  function updateSignagePanel() {
    const panelEl = document.querySelector('.tt-signage-panel');
    if (!panelEl) return;
    let active = getActiveSlides();
    if (active.length === 0) active = getDefaultSignageSlides();
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
    if (cachedScreenData.results) screens.push('results');
    screens.push('idle');
    // Only include lobby near game time (not during off-hours)
    if (cachedScreenData.lobby && minutesUntilNextGame() <= 15) {
      screens.push('lobby');
    }
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
      startCountdownTick();
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
    // idle is always available (uses default signage), doesn't need cached data
    if (screenName === 'idle') {
      currentScreen = '';
      localQuestionNumber = null;
      renderScreen({ screen: 'idle' });
      return;
    }
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

  /** Start the screen rotation timer (per-screen durations) */
  function startRotationTimer() {
    stopRotationTimer();
    if (rotationScreens.length <= 1) return;
    const currentScreenName = rotationScreens[rotationIdx % rotationScreens.length];
    const duration = ROTATION_DURATIONS[currentScreenName] || 30000;
    rotationTimer = setTimeout(() => {
      rotationIdx = (rotationIdx + 1) % rotationScreens.length;
      fadeScreenTransition(() => renderRotationScreen());
      startRotationTimer();
    }, duration);
  }

  /** Stop the screen rotation timer */
  function stopRotationTimer() {
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
    }
  }

  /** 1-second tick to keep rotation countdown displays live */
  function startCountdownTick() {
    stopCountdownTick();
    countdownTickTimer = setInterval(() => {
      if (!rotationActive) { stopCountdownTick(); return; }
      updateCurrentRotatedScreen();
    }, 1000);
  }
  function stopCountdownTick() {
    if (countdownTickTimer) { clearInterval(countdownTickTimer); countdownTickTimer = null; }
  }

  /** Exit rotation mode when active gameplay resumes */
  function exitRotationMode() {
    if (!rotationActive) return;
    rotationActive = false;
    stopRotationTimer();
    stopCountdownTick();
    rotationScreens = [];
    rotationIdx = 0;
    // Cancel any in-progress fade transition to prevent visual pop
    if (fadeTimeout) { clearTimeout(fadeTimeout); fadeTimeout = null; }
    const cover = document.getElementById('tt-fade-cover');
    if (cover) cover.style.opacity = '0';
  }

  // --- Full-Screen Signage Renderers (7 templates, all at 2×) ---

  const SIGNAGE_FS = {
    _default_cta() {
      return `
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#040812,#0a1628 30%,#122040 50%,#0a1628)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">🧠</div>
            <div class="tt-signage-headline">Play TapTrivia!</div>
            <div class="tt-signage-body">Live trivia every 15 minutes — grab your phone and join the game!</div>
            <div class="tt-signage-subtext">Scan the QR code or visit app.taptrivia.tv</div>
            <div style="display:flex;align-items:center;gap:24px;margin-top:24px">
              ${qrCodeHTML(140)}
              <div>
                <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:2px">SCAN TO JOIN</div>
                <div style="font-family:'Fredoka',sans-serif;font-size:36px;font-weight:700;color:#ffd200;letter-spacing:3px">${barCode}</div>
                <div style="font-family:'Outfit',sans-serif;font-size:20px;color:rgba(255,255,255,0.45)">app.taptrivia.tv</div>
              </div>
            </div>
          </div>
        </div>`;
    },
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
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#0a0612,#1a0f30 30%,#2d1550 60%,#1a0f30)">
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
        </div>`;
    },

    happyhour(d) {
      const deals = (d.deals || []).map(deal => `
        <div class="tt-signage-deal">
          <div class="tt-signage-deal__value" style="color:${deal.color || '#f59e0b'}">${deal.deal || ''}</div>
          <div class="tt-signage-deal__item">${deal.item || ''}</div>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#0f0a00,#1a1000 30%,#2a1a00 50%,#1a1000)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-label" style="color:#f59e0b;animation:neonPulse 2s ease-in-out infinite">${d.emoji || ''} Happy Hour</div>
            <div class="tt-signage-headline">${d.timeRange || ''}</div>
            <div class="tt-signage-subtitle">${d.frequency || ''}</div>
            <div class="tt-signage-deals">${deals}</div>
          </div>
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
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#06060f,#0e0824 30%,#1e1050 50%,#0e0824)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-label" style="color:#667eea">${d.when || ''}</div>
            <div class="tt-signage-headline">${d.eventName || ''}</div>
            <div class="tt-signage-subtitle">${d.details || ''}</div>
            <div class="tt-signage-prizes">${prizes}</div>
          </div>
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
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#08060e,#120e22 30%,#1e1440 50%,#120e22)">
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
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#040812,#0a1628 30%,#122040 50%,#0a1628)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-headline">${d.headline || ''}</div>
            <div class="tt-signage-body">${d.message || ''}</div>
            ${d.subtext ? `<div class="tt-signage-subtext">${d.subtext}</div>` : ''}
          </div>
        </div>`;
    },

    sports(d) {
      return `
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#0a0400,#1a0e00 30%,#2a1400 50%,#1a0e00)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-label" style="color:#ff4757">${d.headline || 'Game Day'}</div>
            <div class="tt-signage-headline">${d.matchup || ''}</div>
            <div class="tt-signage-subtitle">${d.when || ''}</div>
            <div class="tt-signage-promo">${d.promo || ''}</div>
            ${d.tagline ? `<div class="tt-signage-tagline">${d.tagline}</div>` : ''}
          </div>
        </div>`;
    },

    custom(d) {
      const items = (d.items || []).map(item => `
        <div class="tt-signage-item">
          <span class="tt-signage-item__emoji">${item.emoji || ''}</span>
          <span class="tt-signage-item__text">${item.text || ''}</span>
        </div>`).join('');
      return `
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#040a12,#0a1420 30%,#0e1e35 50%,#0a1420)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-big-emoji">${d.emoji || ''}</div>
            <div class="tt-signage-headline">${d.headline || ''}</div>
            <div class="tt-signage-body">${d.body || ''}</div>
            ${items ? `<div class="tt-signage-items">${items}</div>` : ''}
          </div>
        </div>`;
    },

    /** Default "Scan to Join" slide — large centered QR code */
    _defaultQr(d) {
      return `
        <div class="tt-signage-fs tt-signage-fade-in" style="background:linear-gradient(150deg,#0a0218,#1a0c3a 30%,#2e1458 50%,#1a0c3a)">
          ${signageHeaderHTML()}
          <div class="tt-signage-center">
            <div class="tt-signage-headline" style="font-size:64px;margin-bottom:40px">Scan to Join</div>
            ${qrCodeHTML(200)}
            <div style="margin-top:36px;display:flex;align-items:center;gap:16px;justify-content:center">
              <span style="font-size:28px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:3px">BAR CODE</span>
              <span style="font-family:'Fredoka',sans-serif;font-size:48px;font-weight:700;color:#ffd200;letter-spacing:6px">${barCode}</span>
            </div>
            <div style="font-size:30px;color:#ffd200;margin-top:16px;font-weight:600">app.taptrivia.tv</div>
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
  };

  // --- In-Game Panel Renderers (7 templates, 680px at 2×) ---

  const SIGNAGE_PANEL = {
    _default_cta() {
      return `
        <div class="tt-signage-panel__inner">
          ${signagePanelHeaderHTML()}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:8px">
            <div style="font-size:96px">🧠</div>
            <div class="tt-signage-panel__label" style="color:#667eea">EVERY 15 MINUTES</div>
            <div class="tt-signage-panel__headline">Play TapTrivia!</div>
            <div class="tt-signage-panel__subtitle">Free to play · Win prizes · Have fun</div>
          </div>
          <div class="tt-signage-panel__qr" style="padding:16px 20px;gap:20px">
            ${qrCodeHTML(140)}
            <div>
              <div class="tt-signage-panel__qr-text">Join Trivia!</div>
              <div class="tt-signage-panel__qr-url">app.taptrivia.tv</div>
              <div class="tt-signage-panel__qr-code-row">
                <span class="tt-signage-panel__qr-code-label">CODE</span>
                <span class="tt-signage-panel__qr-code">${barCode}</span>
              </div>
            </div>
          </div>
        </div>`;
    },
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

  /** Built-in default signage slides shown when location has no custom signage */
  function getDefaultSignageSlides() {
    return [
      {
        template: '_default_cta',
        enabled: true,
        data: {},
      },
    ];
  }

  /** Get signage panel HTML with divider for in-game screens */
  function signagePanelWrapHTML() {
    let active = getActiveSlides();
    if (active.length === 0) active = getDefaultSignageSlides();
    if (active.length === 0) return '';
    const idx = signageCurrentIndex % active.length;
    const slide = active[idx];
    const renderer = SIGNAGE_PANEL[slide.template];
    if (!renderer) return '';
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
      if (screen.startsWith('between-')) return; // Between-game phases: static
      return; // All other screens: static, no update needed
    }

    // Stop local clock when leaving playing screen
    if (currentScreen === 'playing' && screen !== 'playing') stopLocalClock();
    // Stop signage rotation and idle countdown when leaving idle
    if (currentScreen === 'idle' && screen !== 'idle') { stopSignageRotation(); stopIdleCountdownTick(); }

    currentScreen = screen;
    localQuestionNumber = qNum;
    lastLoggedSlideKey = ''; // screen changed — re-log even if same slide index
    queueMicrotask(logSignageImpressionIfNew);

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

  /** IDLE / ATTRACT SCREEN — shows signage slides, falls back to built-in defaults */
  function renderIdle() {
    let active = getActiveSlides();
    if (active.length === 0) active = getDefaultSignageSlides();
    if (active.length > 0) {
      const idx = signageCurrentIndex % active.length;
      const html = renderSignageFullScreen(active[idx]);
      if (html) {
        screenEl.innerHTML = html;
        if (!signageRotationTimer && active.length > 1) startSignageRotation();
        startIdleCountdownTick();
        return;
      }
    }
    // Ultimate fallback (shouldn't reach here with defaults)
    stopSignageRotation();
    stopIdleCountdownTick();
    screenEl.innerHTML = `
      <div class="tt-idle">
        ${resetArrowHTML()}
        <div class="tt-idle__logo">${logoHTML('xl')}</div>
        ${barNameHTML('xl')}
        <div class="tt-idle__cta">Live trivia every 15 minutes!</div>
        <div class="tt-idle__sub">Scan the QR code to play on your phone</div>
      </div>`;
    bindResetArrow();
  }

  /** Platform-specific device settings instructions (shown as modal on setup screen) */
  function platformInstructionsHTML() {
    const INSTRUCTIONS = {
      firestickvega: {
        device: 'Fire TV Stick',
        steps: [
          'Settings → Preferences → Data Usage Monitoring → Still Watching → <strong>Off</strong>'
        ]
      },
      firestickclassic: {
        device: 'Fire TV Stick',
        steps: [
          'Settings → Preferences → Data Usage Monitoring → Still Watching → <strong>Off</strong>',
          'Settings → Display & Sounds → Screensaver → Start Time → <strong>Never</strong>'
        ]
      },
      roku: {
        device: 'Roku',
        steps: [
          'Settings → Network → Bandwidth Saver → <strong>Off</strong>',
          'Settings → Theme → Screensaver → <strong>Disabled</strong>',
          'Settings → System → Power → Auto Power Savings → <strong>Off</strong>'
        ]
      }
    };
    const info = INSTRUCTIONS[tvPlatform];
    if (!info || platformModalDismissed) return '';
    const stepsHTML = info.steps.map((s, i) =>
      `<div class="tt-setup__pi-step"><span class="tt-setup__pi-num">${i + 1}</span><span>${s}</span></div>`
    ).join('');
    return `
      <div class="tt-pi-overlay" id="tt-pi-overlay">
        <div class="tt-pi-modal">
          <button class="tt-pi-close" id="tt-pi-close" title="Close">✕</button>
          <div class="tt-pi-modal-icon">⚙️</div>
          <div class="tt-pi-modal-title">Recommended ${info.device} Settings</div>
          <div class="tt-pi-modal-desc">For uninterrupted 24/7 display, adjust these settings on your device:</div>
          <div class="tt-setup__pi-steps">${stepsHTML}</div>
          <button class="tt-pi-got-it" id="tt-pi-got-it">Got It</button>
        </div>
      </div>`;
  }

  function bindPlatformInstructionsEvents() {
    const overlay = document.getElementById('tt-pi-overlay');
    if (!overlay) return;
    const close = () => { platformModalDismissed = true; overlay.remove(); };
    document.getElementById('tt-pi-close')?.addEventListener('click', close);
    document.getElementById('tt-pi-got-it')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  /** SETUP SCREEN — split-panel: Register (left) | Activate (right) */
  function renderSetup() {

    // ── Left panel content based on regState ──
    let leftHTML = '';
    if (setupRegState === 'form') {
      const emailVal = setupEmail || '';
      const showSignageCallout = !emailVal.trim();
      leftHTML = `
        <div style="margin-bottom:36px">
          <div class="tt-setup__badge tt-setup__badge--new">
            <span style="font-size:15px">🆕</span>
            <span>New Location</span>
          </div>
          <h2 class="tt-setup__title">Register Your Location</h2>
          <p class="tt-setup__desc">Everything is free — live trivia, signage, analytics. Just enter your location name to get started.</p>
        </div>
        <div class="tt-setup__form">
          <div class="tt-setup__field">
            <span class="tt-setup__field-icon">📍</span>
            <input type="text" id="tt-setup-loc" class="tt-setup__input" placeholder="Your location's name" maxlength="50" autocomplete="off" value="${setupLocName}">
          </div>
          <div>
            <div class="tt-setup__field">
              <span class="tt-setup__field-icon">✉️</span>
              <input type="email" id="tt-setup-email" class="tt-setup__input" placeholder="Owner email (optional)" maxlength="100" autocomplete="off" value="${emailVal}">
            </div>
            ${showSignageCallout ? `
              <div class="tt-setup__signage-callout">
                <span style="font-size:26px">📺</span>
                <div>
                  <span class="tt-setup__signage-callout-title">Free Digital Signage</span>
                  <span class="tt-setup__signage-callout-desc">Add your email to get free signage, a dashboard &amp; analytics — all completely free</span>
                </div>
              </div>` : `
              <div class="tt-setup__signage-unlocked">
                <span style="font-size:16px">✅</span>
                <span>Signage, dashboard &amp; analytics unlocked — all free</span>
              </div>`}
          </div>
        </div>
        <div class="tt-setup__features">
          <div class="tt-setup__feature" style="animation:slideUp .5s ease-out .1s both">
            <span class="tt-setup__feature-icon">🎯</span>
            <span class="tt-setup__feature-text">Free live trivia that drives traffic and keeps guests longer</span>
          </div>
          <div class="tt-setup__feature" style="animation:slideUp .5s ease-out .15s both">
            <span class="tt-setup__feature-icon">📺</span>
            <span class="tt-setup__feature-text">Free digital signage to promote your specials &amp; events</span>
          </div>
          <div class="tt-setup__feature" style="animation:slideUp .5s ease-out .2s both">
            <span class="tt-setup__feature-icon">📊</span>
            <span class="tt-setup__feature-text">Free dashboard with player metrics and engagement analytics</span>
          </div>
        </div>
        <button id="tt-setup-reg-btn" class="tt-setup__btn tt-setup__btn--gold">
          <span class="tt-setup__btn-icon">📧</span>
          <span class="tt-setup__btn-label">Register &amp; Get Code</span>
        </button>
        <p class="tt-setup__hint">Use your TV remote or USB keyboard to type</p>`;
    } else if (setupRegState === 'sending') {
      leftHTML = `
        <div class="tt-setup__spinner">
          <div class="tt-setup__spinner-ring"></div>
          <div class="tt-setup__spinner-text">Setting up your location...</div>
        </div>`;
    } else if (setupRegState === 'sent') {
      const hasEmail = setupEmail && setupEmail.trim().length > 0;
      leftHTML = `
        <div class="tt-setup__success">
          <div class="tt-setup__check-circle">✅</div>
          <h2 class="tt-setup__success-title">You're Registered!</h2>
          <p class="tt-setup__success-desc">Your code is ready — <strong>hit Activate on the right</strong> to get this TV running.</p>
          ${hasEmail ? `
            <div class="tt-setup__email-box">
              <div class="tt-setup__email-box-label">📧 We also emailed you at:</div>
              <div class="tt-setup__email-box-value">${setupEmail}</div>
              <span class="tt-setup__email-box-hint">Check your email for instructions to set up your dashboard and digital signage.</span>
            </div>` : `
            <div class="tt-setup__upsell-box">
              <span class="tt-setup__upsell-title">📺 Don't miss your free signage!</span>
              <span class="tt-setup__upsell-desc">Re-register with your email to get free digital signage, your management dashboard, and player analytics. Everything is free — no catch.</span>
            </div>`}
          <button id="tt-setup-startover" class="tt-setup__start-over">← Start over</button>
        </div>`;
    }

    // ── Right panel content based on codeState ──
    let rightHTML = '';
    if (setupCodeState !== 'activated') {
      const badgeClass = setupCodeAutoFilled ? 'tt-setup__badge--ready' : 'tt-setup__badge--code';
      const badgeIcon = setupCodeAutoFilled ? '✓' : '🔑';
      const badgeText = setupCodeAutoFilled ? 'Code Ready' : 'Have a Code';
      const descText = setupCodeAutoFilled
        ? 'Your code is loaded and ready. Hit activate to start!'
        : 'Enter the 5-character code from your registration email to pair this TV to your location.';
      const descAnim = setupCodeAutoFilled ? ' style="animation:slideInRight .5s ease-out"' : '';
      const codeComplete = setupCode.every(c => c !== '');
      const isVerifying = setupCodeState === 'verifying';

      let codeBoxesHTML = '';
      for (let i = 0; i < 5; i++) {
        const val = setupCode[i] || '';
        const filledClass = val ? ' tt-setup__code-box--filled' : '';
        const roClass = setupCodeAutoFilled ? ' tt-setup__code-box--readonly' : '';
        codeBoxesHTML += `<input type="text" class="tt-setup__code-box${filledClass}${roClass}" data-code-idx="${i}" value="${val}" maxlength="2" ${setupCodeAutoFilled ? 'readonly' : ''} autocomplete="off">`;
      }

      let errorHTML = '';
      if (setupCodeState === 'error') {
        errorHTML = `
          <div class="tt-setup__error">
            <span style="font-size:18px">⚠️</span>
            <span class="tt-setup__error-text">Code not found. Check your email and try again.</span>
          </div>`;
      }

      const btnLabel = isVerifying ? 'Activating...' : 'Activate This TV';
      const btnIcon = isVerifying ? '⏳' : '📺';
      const btnDisabled = !codeComplete || isVerifying ? ' disabled' : '';
      const btnPulse = setupCodeAutoFilled && setupCodeState === 'input' ? ' tt-setup__btn--pulse' : '';

      rightHTML = `
        <div class="${badgeClass} tt-setup__badge">
          <span style="font-size:15px">${badgeIcon}</span>
          <span>${badgeText}</span>
        </div>
        <h2 class="tt-setup__title" style="text-align:center">Activate This TV</h2>
        <p class="tt-setup__desc tt-setup__desc--center"${descAnim}>${descText}</p>
        <div class="tt-setup__code-wrap${setupCodeAutoFilled ? ' tt-setup__code-wrap--pop' : ''}">
          <div class="tt-setup__code-boxes">${codeBoxesHTML}</div>
          ${codeComplete ? '<button id="tt-setup-clear-btn" class="tt-setup__clear-btn" title="Clear code">✕</button>' : ''}
        </div>
        <div class="tt-setup__multi-tv${setupCodeAutoFilled ? ' tt-setup__multi-tv--glow' : ''}">
          <span class="tt-setup__multi-tv-title">Use this code on all your TVs</span>
          <span class="tt-setup__multi-tv-desc">One code activates every screen at your location</span>
        </div>
        ${errorHTML}
        <div class="tt-setup__activate-wrap">
          <button id="tt-setup-activate-btn" class="tt-setup__btn tt-setup__btn--green${btnPulse}"${btnDisabled}>
            <span class="tt-setup__btn-icon">${btnIcon}</span>
            <span class="tt-setup__btn-label">${btnLabel}</span>
          </button>
        </div>
        ${!setupCodeAutoFilled ? '<p class="tt-setup__lost-code">Lost your code? Check your email or register on the left.</p>' : ''}`;
    } else {
      const displayName = setupLocName || barName || 'Your location';
      rightHTML = `
        <div class="tt-setup__activated">
          <div class="tt-setup__activated-circle">🎉</div>
          <h2 class="tt-setup__activated-title">You're Live!</h2>
          <p class="tt-setup__activated-desc"><strong>${displayName}</strong> is now connected. Trivia starts here.</p>
          <div class="tt-setup__activated-loading">Loading trivia experience...</div>
        </div>`;
    }

    screenEl.innerHTML = `
      <div class="tt-setup__header">${logoHTML('lg')}</div>
      <div class="tt-setup__panels">
        <div class="tt-setup__panel tt-setup__panel--left">${leftHTML}</div>
        <div class="tt-setup__divider"><div class="tt-setup__divider-or">OR</div></div>
        <div class="tt-setup__panel tt-setup__panel--right">${rightHTML}</div>
      </div>
      ${platformInstructionsHTML()}
      <div class="tt-setup__footer">
        <span class="tt-setup__footer-text">taptrivia.tv · Free for venues · Powered by Visudo Labs</span>
      </div>`;

    // ── Bind events ──
    bindSetupEvents();
    bindPlatformInstructionsEvents();
  }

  function bindSetupEvents() {
    // Registration form
    const locInput = document.getElementById('tt-setup-loc');
    const emailInput = document.getElementById('tt-setup-email');
    const regBtn = document.getElementById('tt-setup-reg-btn');

    if (locInput) {
      locInput.addEventListener('input', () => { setupLocName = locInput.value; });
      locInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && emailInput) emailInput.focus();
      });
      locInput.focus();
    }
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        setupEmail = emailInput.value;
        // Live-update signage callout
        const callout = emailInput.closest('div').querySelector('.tt-setup__signage-callout');
        const unlocked = emailInput.closest('div').querySelector('.tt-setup__signage-unlocked');
        if (emailInput.value.trim()) {
          if (callout) callout.style.display = 'none';
          if (unlocked) unlocked.style.display = 'flex';
        } else {
          if (callout) callout.style.display = 'flex';
          if (unlocked) unlocked.style.display = 'none';
        }
      });
      emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') registerBar(); });
    }
    if (regBtn) {
      regBtn.addEventListener('click', registerBar);
    }

    // Start over
    const startOverBtn = document.getElementById('tt-setup-startover');
    if (startOverBtn) {
      startOverBtn.addEventListener('click', () => {
        setupRegState = 'form';
        setupLocName = '';
        setupEmail = '';
        setupCode = ['', '', '', '', ''];
        setupCodeAutoFilled = false;
        setupCodeState = 'input';
        renderSetup();
      });
    }

    // Code box inputs
    const codeBoxes = document.querySelectorAll('.tt-setup__code-box');
    codeBoxes.forEach((box, i) => {
      if (box.hasAttribute('readonly')) return;
      box.addEventListener('input', (e) => {
        const char = e.target.value.slice(-1).toUpperCase();
        if (char && !/^[A-Z0-9]$/.test(char)) {
          e.target.value = setupCode[i] || '';
          return;
        }
        setupCode[i] = char;
        e.target.value = char;
        // Update styling
        if (char) {
          box.classList.add('tt-setup__code-box--filled');
          if (i < 4) codeBoxes[i + 1].focus();
        } else {
          box.classList.remove('tt-setup__code-box--filled');
        }
        updateActivateButton();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !setupCode[i] && i > 0) {
          codeBoxes[i - 1].focus();
        }
        if (e.key === 'Enter') activateTV();
      });
    });
    // Auto-focus first empty code box if not auto-filled
    if (!setupCodeAutoFilled && codeBoxes.length > 0) {
      const firstEmpty = setupCode.findIndex(c => !c);
      if (firstEmpty >= 0 && !document.getElementById('tt-setup-loc')) {
        codeBoxes[firstEmpty].focus();
      }
    }

    // Clear code button
    const clearBtn = document.getElementById('tt-setup-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        setupCode = ['', '', '', '', ''];
        setupCodeAutoFilled = false;
        setupCodeState = 'input';
        renderSetup();
      });
    }

    // Activate button
    const activateBtn = document.getElementById('tt-setup-activate-btn');
    if (activateBtn) {
      activateBtn.addEventListener('click', activateTV);
    }
  }

  function updateActivateButton() {
    const btn = document.getElementById('tt-setup-activate-btn');
    if (!btn) return;
    const codeComplete = setupCode.every(c => c !== '');
    btn.disabled = !codeComplete || setupCodeState === 'verifying';
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

    // Countdown to next game (always compute client-side like player-app)
    const nextEpoch = getNextFutureGameTime(state.nextGameStartEpoch);
    const secsLeft = Math.max(0, Math.ceil((nextEpoch - getServerNow()) / 1000));
    const countdownHTML = `
      <div class="tt-lobby__countdown">
        <span class="tt-lobby__countdown-label">Next game in</span>
        <span class="tt-lobby__countdown-num" id="tv-lobby-countdown">${formatCountdown(secsLeft)}</span>
      </div>`;

    screenEl.innerHTML = `
      <div class="tt-lobby${panel ? ' tt-lobby--with-panel' : ''}">
        ${resetArrowHTML()}
        ${countdownHTML}
        <div class="tt-lobby__left">
          <div class="tt-lobby__logo">${logoHTML('xl')}</div>
          ${barNameHTML('lg')}
          <div class="tt-lobby__subtitle">Scan to join or enter code below</div>
          ${qrCodeHTML(360)}
          <div class="tt-lobby__code-section">
            <div class="tt-lobby__code-label">Or Enter Code</div>
            <div class="tt-lobby__code">${barCode}</div>
            <div class="tt-lobby__url">app.taptrivia.tv</div>
          </div>
        </div>
        <div class="tt-lobby__right">
          <div class="tt-lobby__player-label">${count} Players Ready</div>
          <div class="tt-lobby__player-grid">${playerGrid}</div>
        </div>
        ${panel}
      </div>`;
    bindResetArrow();
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
        ${resetArrowHTML()}
        ${barNameHTML('md')}
        <div class="tt-category__counter">QUESTION ${num} OF ${total}</div>
        <div class="tt-category__icon">${icon}</div>
        <div class="tt-category__name">${category}</div>
        ${sub ? `<div class="tt-category__sub">${sub}</div>` : ''}
        <div class="tt-category__difficulty">${difficultyHTML(diff)}</div>
      </div>
      ${qrBadgeHTML('bl')}`;
    bindResetArrow();
  }

  /** PLAYING SCREEN — v4 lines 557-595 */
  function renderPlaying(state) {
    const q = state.question || {};
    const sub = q.subcategory || state.subcategory || '';
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

    // Don't show scores during question — it gives away who answered correctly
    let footerPlayers = '';
    scores.slice(0, 5).forEach((p, i) => {
      const name = p.name || p.playerName || 'Player';
      footerPlayers += `
        <div class="tt-play__footer-player">
          ${avatarHTML(name, { rank: i + 1, size: 'sm' })}
          <div>
            <div class="tt-play__footer-name">${name}</div>
          </div>
        </div>`;
    });

    screenEl.innerHTML = `
      <div class="tt-play">
        ${resetArrowHTML()}
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
            ${sub ? `<div class="tt-play__sub" style="font-size:42px">${sub}</div>` : ''}
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
    bindResetArrow();
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
    const sub = q.subcategory || state.subcategory || '';
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
        ${resetArrowHTML()}
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
            ${sub ? `<div class="tt-play__sub">${sub}</div>` : ''}
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
    bindResetArrow();
  }

  /** BETWEEN QUESTIONS — left: fun fact + standings, right: signage panel */
  function renderBetween(state) {
    const scores = state.scores || [];
    const num = state.questionNumber || 1;
    const totalQ = state.totalQuestions || 15;
    const nextIn = state.nextQuestionIn || 5;
    const isLastQuestion = num >= totalQ;
    const funFactRaw = state.funFact || '';
    const funFact = funFactRaw && !funFactRaw.startsWith('This is a fun fact placeholder') ? funFactRaw : '';
    const panel = signagePanelWrapHTML();

    let countdownLine = '';
    if (rotationActive) {
      if (state.nextGameStartEpoch) {
        const secsLeft = Math.max(0, Math.ceil((state.nextGameStartEpoch - getServerNow()) / 1000));
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

    // Fun fact card (only if non-empty and not placeholder)
    let funFactHTML = '';
    if (funFact) {
      funFactHTML = `
        <div class="tt-between__funfact-card">
          <div class="tt-between__funfact-label">DID YOU KNOW?</div>
          <div class="tt-between__funfact-text">${funFact}</div>
        </div>`;
    }

    // Standings rows (top 5 for half-width layout)
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

    // Advance signage to next slide each time standings appears (no rotation while visible)
    stopSignageRotation();
    const activeSlides = getActiveSlides();
    if (activeSlides.length > 1) {
      signageCurrentIndex = (signageCurrentIndex + 1) % activeSlides.length;
    }

    // Re-get panel after advancing index
    const panelFinal = signagePanelWrapHTML();

    screenEl.innerHTML = `
      <div class="tt-between tt-between--half${panelFinal ? ' tt-between--with-panel' : ''}">
        ${resetArrowHTML()}
        <div class="tt-between__panel">
          ${funFactHTML}
          <div class="tt-between__spacer"></div>
          ${logoHTML('sm')}
          ${barNameHTML('md')}
          <div class="tt-between__section-label">Standings</div>
          <div class="tt-between__standings">${standingsHTML}</div>
          ${countdownLine}
        </div>
        ${panelFinal}
      </div>`;
    bindResetArrow();
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
          ${resetArrowHTML()}
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
          ${resetArrowHTML()}
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
    // Advance signage one slide each time leaderboard appears (no rotation while visible)
    stopSignageRotation();
    if (getActiveSlides().length > 1) {
      signageCurrentIndex = (signageCurrentIndex + 1) % getActiveSlides().length;
    }
    bindResetArrow();
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

    // Next game countdown (always compute client-side like player-app)
    const nextEpoch = getNextFutureGameTime(state.nextGameStartEpoch);
    const secsLeft = Math.max(0, Math.ceil((nextEpoch - getServerNow()) / 1000));
    const countdownHTML = `
      <div class="tt-results__countdown">
        <span class="tt-results__countdown-label">Next game in</span>
        <span class="tt-results__countdown-num" id="tv-results-countdown">${formatCountdown(secsLeft)}</span>
      </div>`;

    screenEl.innerHTML = `
      <div class="tt-results tt-results--half${panel ? ' tt-results--with-panel' : ''}">
        ${resetArrowHTML()}
        <div class="tt-results__panel">
          ${countdownHTML}
          <div class="tt-results__trophy">🏆</div>
          <div class="tt-results__title">Game Over!</div>
          <div class="tt-results__subtitle">${totalQ} questions · ${playerCount} players</div>
          <div class="tt-results__podium">${podiumInner}</div>
          ${runnersHTML}
        </div>
        ${panel}
      </div>`;
    // No signage rotation on results — advance one slide each render
    stopSignageRotation();
    if (getActiveSlides().length > 1) {
      signageCurrentIndex = (signageCurrentIndex + 1) % getActiveSlides().length;
    }
    bindResetArrow();
  }

  // ═══════════════════════════════════════════════════════════════
  // BETWEEN-GAME EXPERIENCE — 4-phase post-game sequence
  // ═══════════════════════════════════════════════════════════════

  /** Countdown bar overlay HTML — persistent across all between-game phases */
  function betweenCountdownBarHTML() {
    return '<div class="tt-between-countdown" id="tt-between-countdown"><span class="tt-between-countdown__label">NEXT GAME IN</span> <span class="tt-between-countdown__time" id="tt-between-countdown-time"></span></div>';
  }

  /** Update the between-game countdown bar display */
  function updateBetweenGameCountdown() {
    const el = document.getElementById('tt-between-countdown-time');
    if (!el) return;
    // Use hype.startsAt if available, otherwise compute client-side
    const startsAt = betweenGameData?.hype?.startsAt;
    const nextEpoch = getNextFutureGameTime(startsAt);
    const secsLeft = Math.max(0, Math.ceil((nextEpoch - getServerNow()) / 1000));
    el.textContent = formatCountdown(secsLeft);
    // Gold pulse when ≤15s
    const bar = document.getElementById('tt-between-countdown');
    if (bar) {
      if (secsLeft <= 15) bar.classList.add('tt-between-countdown--urgent');
      else bar.classList.remove('tt-between-countdown--urgent');
    }
  }

  /** BETWEEN-GAME PODIUM — Trophy, top 3, ranks 4-10, confetti, QR */
  function renderBetweenPodium(data) {
    const { players = [], questionCount = 15, playerCount = 0 } = data;
    const top3 = players.slice(0, 3);
    const rest = players.slice(3, 10);
    const isEmpty = players.length === 0;

    let rankRows = '';
    rest.forEach((p, i) => {
      rankRows += `
        <div class="tt-bg-rank-row" style="animation:rankSlide .3s ease-out ${i * 0.06}s both">
          <span class="tt-bg-rank-row__rank">${p.rank}</span>
          ${avatarHTML(p.name, { size: 'sm' })}
          <span class="tt-bg-rank-row__name">${p.name}</span>
          <span class="tt-bg-rank-row__score">${p.score.toLocaleString()}</span>
        </div>`;
    });

    const statsText = isEmpty
      ? `${questionCount} questions`
      : `${questionCount} questions · ${playerCount} player${playerCount === 1 ? '' : 's'}`;

    const hasRunners = rest.length > 0;

    screenEl.innerHTML = `
      <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column">
        ${betweenCountdownBarHTML()}
        ${resetArrowHTML()}
        ${!isEmpty ? confettiHTML(20) : ''}

        <!-- Main content row -->
        <div style="flex:1;display:flex;padding:72px 60px 0">
          <!-- Left: Trophy + Podium -->
          <div style="flex:${hasRunners ? '1.2' : '1'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
            <div class="tt-bg-podium__trophy" style="animation:trophy .6s ease-out both">🏆</div>
            <div class="tt-bg-podium__title" style="animation:fadeDown .5s ease-out .2s both">Game Over!</div>
            <div class="tt-bg-podium__subtitle" style="animation:fadeDown .5s ease-out .3s both">${statsText}</div>
            ${!isEmpty ? podiumHTML(top3, { avatarSizes: ['xl', '2xl', 'xl'] }) : `
              <div style="margin-top:20px;font-family:'Outfit',sans-serif;font-size:32px;color:rgba(255,255,255,0.5);animation:fadeDown .5s ease-out .4s both">No players this round</div>
            `}
          </div>

          ${hasRunners ? `
          <!-- Right: Ranks 4-10 -->
          <div style="flex:0.8;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:0 40px">
            <div class="tt-bg-podium__ranks-header" style="animation:fadeDown .3s ease-out both">ALSO IN THE TOP 10</div>
            <div class="tt-bg-podium__ranks">${rankRows}</div>
          </div>
          ` : ''}
        </div>

        <!-- Bottom: Large centered QR -->
        <div style="display:flex;justify-content:center;padding:0 0 40px;animation:slideUp .5s ease-out .5s both">
          <div style="display:flex;align-items:center;gap:28px;background:rgba(0,0,0,0.35);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:20px 36px;border-radius:16px">
            ${qrCodeHTML(140)}
            <div>
              <div style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:2px">SCAN TO JOIN</div>
              <div style="font-family:'Fredoka',sans-serif;font-size:40px;font-weight:700;color:#ffd200;letter-spacing:4px">${barCode}</div>
              <div style="font-family:'Outfit',sans-serif;font-size:22px;color:rgba(255,255,255,0.5)">app.taptrivia.tv</div>
            </div>
          </div>
        </div>
      </div>`;
    bindResetArrow();
  }

  /** BETWEEN-GAME STANDINGS — Location's weekly Score Index, state rankings */
  function renderBetweenStandings(data) {
    const { yourBar = {}, stateRanking = [], stateName = '' } = data;

    let rankingRows = '';
    stateRanking.forEach((b, i) => {
      const isYours = b.name === yourBar.name;
      const delta = b.delta > 0 ? `<span class="tt-bg-delta tt-bg-delta--up">▲${b.delta}</span>`
        : b.delta < 0 ? `<span class="tt-bg-delta tt-bg-delta--down">▼${Math.abs(b.delta)}</span>`
        : `<span class="tt-bg-delta tt-bg-delta--flat">—</span>`;
      rankingRows += `
        <div class="tt-bg-bar-row${isYours ? ' tt-bg-bar-row--you' : ''}" style="animation:rankSlide .3s ease-out ${i * 0.08}s both">
          <span class="tt-bg-bar-row__rank">#${b.rank}</span>
          <div class="tt-bg-bar-row__info">
            <span class="tt-bg-bar-row__name">${b.name}${isYours ? ' <span class="tt-bg-bar-row__you-tag">YOU</span>' : ''}</span>
            <span class="tt-bg-bar-row__city">${b.city || ''}</span>
          </div>
          <span class="tt-bg-bar-row__index">${(b.index || 0).toLocaleString()}</span>
          ${delta}
        </div>`;
    });

    const yourDeltaNum = yourBar.delta || 0;
    const yourDeltaHTML = yourDeltaNum > 0
      ? `<div class="tt-bg-standings__delta-pill tt-bg-standings__delta-pill--up">▲ ${yourDeltaNum} spots this week</div>`
      : yourDeltaNum < 0
      ? `<div class="tt-bg-standings__delta-pill tt-bg-standings__delta-pill--down">▼ ${Math.abs(yourDeltaNum)} spots this week</div>`
      : '';

    screenEl.innerHTML = `
      <div class="tt-bg-standings">
        ${betweenCountdownBarHTML()}
        ${resetArrowHTML()}
        <div class="tt-bg-standings__left">
          <div class="tt-bg-standings__header" style="animation:fadeDown .5s ease-out both">
            <span class="tt-bg-standings__header-icon">🏆</span>
            <div>
              <div class="tt-bg-standings__header-title">Tap Standings</div>
              <div class="tt-bg-standings__header-sub">Weekly Score Index · ${stateName}</div>
            </div>
          </div>
          <div class="tt-bg-standings__your-bar tt-glass" style="animation:slideUp .5s ease-out .1s both">
            <div class="tt-bg-standings__your-bar-header">
              <div>
                <div class="tt-bg-standings__your-label">YOUR LOCATION</div>
                <div class="tt-bg-standings__bar-name">${yourBar.name || barName}</div>
                <div class="tt-bg-standings__bar-city">${yourBar.city || ''}, ${yourBar.state || ''}</div>
                ${yourDeltaHTML}
              </div>
              <div class="tt-bg-standings__bar-index">
                <span class="tt-bg-standings__index-num">${(yourBar.index || 0).toLocaleString()}</span>
                <span class="tt-bg-standings__index-label">SCORE INDEX</span>
              </div>
            </div>
          </div>
          <div class="tt-bg-standings__ranking">${rankingRows}</div>
        </div>
        <div class="tt-bg-standings__right">
          <div class="tt-glass tt-bg-standings__explainer" style="animation:slideUp .5s ease-out .3s both">
            <div class="tt-bg-standings__explainer-title">📊 SCORE INDEX</div>
            <div class="tt-bg-standings__explainer-desc">Average points per player, per question. The higher your location's index, the sharper your regulars.</div>
            <div class="tt-bg-standings__explainer-note">Resets every <strong>Monday</strong></div>
          </div>
          <div class="tt-glass tt-bg-standings__national" style="animation:slideUp .5s ease-out .4s both">
            <div class="tt-bg-standings__national-flag">🇺🇸</div>
            <div class="tt-bg-standings__national-label">NATIONALLY</div>
            <div class="tt-bg-standings__national-rank">#${yourBar.nationalRank || '—'}</div>
            <div class="tt-bg-standings__national-total">of ${yourBar.totalBars || 0} locations</div>
          </div>
          ${betweenQRBadgeHTML('Boost your location\'s rank!')}
        </div>
      </div>`;
    bindResetArrow();
  }

  /** BETWEEN-GAME NATIONAL — Two-column top 25 players, platform stats */
  function renderBetweenNational(data) {
    const { top25 = [], stats = {}, cutoffScore = 0, yourBarBest = null } = data;

    // Split into two columns: 1-12 and 13-25
    const col1 = top25.slice(0, 12);
    const col2 = top25.slice(12, 25);

    function playerRow(p, rank) {
      const isTop3 = rank <= 3;
      const scoreK = p.score >= 1000 ? `${(p.score / 1000).toFixed(1)}k` : p.score;
      const barCity = [p.bar, p.city].filter(Boolean).join(', ');
      return `
        <div class="tt-bg-nat-row${isTop3 ? ' tt-bg-nat-row--gold' : ''}" style="animation:rankSlide .3s ease-out ${rank * 0.03}s both">
          <span class="tt-bg-nat-row__rank">${rank}</span>
          ${avatarHTML(p.name || 'Anon', { size: 'xs', rank: isTop3 ? rank : 0 })}
          <div class="tt-bg-nat-row__info">
            <span class="tt-bg-nat-row__name">${p.name || 'Anonymous'}</span>
            ${barCity ? `<span class="tt-bg-nat-row__bar">${barCity}</span>` : ''}
          </div>
          <span class="tt-bg-nat-row__score">${scoreK}</span>
        </div>`;
    }

    let col1HTML = col1.map((p, i) => playerRow(p, i + 1)).join('');
    let col2HTML = col2.map((p, i) => playerRow(p, i + 13)).join('');

    const statItems = [
      { icon: '👥', label: 'Players', value: (stats.players || 0).toLocaleString() },
      { icon: '🎮', label: 'Games Played', value: (stats.games || 0).toLocaleString() },
      { icon: '❓', label: 'Questions Answered', value: stats.questions >= 1000000 ? `${(stats.questions / 1000000).toFixed(1)}M` : (stats.questions || 0).toLocaleString() },
      { icon: '🍺', label: 'Locations Active', value: (stats.bars || 0).toLocaleString() },
    ];
    const statsHTML = statItems.map(s =>
      `<div class="tt-bg-stat"><span class="tt-bg-stat__icon">${s.icon}</span><span class="tt-bg-stat__label">${s.label}</span><span class="tt-bg-stat__value">${s.value}</span></div>`
    ).join('');

    let cutoffHTML = '';
    const cutoffK = cutoffScore >= 1000 ? `${(cutoffScore / 1000).toFixed(1)}k` : (cutoffScore || 0);
    const yourBarBestHTML = yourBarBest
      ? `<div class="tt-bg-cutoff__your-bar">
          ${avatarHTML(yourBarBest.name, { size: 'xs' })}
          <div>
            <div class="tt-bg-cutoff__your-name">Your location's best: ${yourBarBest.name}</div>
            <div class="tt-bg-cutoff__your-score">${yourBarBest.score >= 1000 ? `${(yourBarBest.score / 1000).toFixed(1)}k` : yourBarBest.score} pts${cutoffScore > yourBarBest.score ? ` — ${((cutoffScore - yourBarBest.score) / 1000).toFixed(1)}k to go` : ''}</div>
          </div>
        </div>` : '';
    cutoffHTML = `
      <div class="tt-glass tt-bg-cutoff" style="animation:slideUp .5s ease-out .4s both">
        <div class="tt-bg-cutoff__title">🎯 TOP 25 CUTOFF</div>
        <div class="tt-bg-cutoff__score">${cutoffK}<span class="tt-bg-cutoff__unit">k</span></div>
        <div class="tt-bg-cutoff__desc">pts to make the board</div>
        ${yourBarBestHTML}
      </div>`;

    screenEl.innerHTML = `
      <div class="tt-bg-national">
        ${betweenCountdownBarHTML()}
        ${resetArrowHTML()}
        <div class="tt-bg-national__left">
          <div class="tt-bg-national__header" style="animation:fadeDown .5s ease-out both">
            <span class="tt-bg-national__header-icon">🌎</span>
            <div>
              <div class="tt-bg-national__header-title">National Top 25</div>
              <div class="tt-bg-national__header-sub">This week's top players across all locations</div>
            </div>
          </div>
          <div class="tt-bg-national__columns">
            <div class="tt-bg-national__col">${col1HTML}</div>
            <div class="tt-bg-national__col">${col2HTML}</div>
          </div>
        </div>
        <div class="tt-bg-national__right">
          <div class="tt-glass tt-bg-national__stats-card" style="animation:slideUp .5s ease-out .2s both">
            <div class="tt-bg-national__stats-title">TAPTRIVIA THIS WEEK</div>
            <div class="tt-bg-national__stats">${statsHTML}</div>
          </div>
          ${cutoffHTML}
          ${betweenQRBadgeHTML('Join the Next Game!')}
        </div>
      </div>`;
    bindResetArrow();
  }

  /** BETWEEN-GAME HYPE — Logo, next game categories, big QR + location code */
  function renderBetweenHype(data) {
    const { categories: allCats = [] } = data;
    const categories = allCats.slice(0, 5);

    const catPills = categories.map((cat, i) =>
      `<span class="tt-bg-hype__pill" style="animation:popIn .3s ease-out ${i * 0.1 + 0.3}s both">${getCategoryIcon(cat)} ${cat}</span>`
    ).join('');

    screenEl.innerHTML = `
      <div class="tt-bg-hype">
        ${betweenCountdownBarHTML()}
        ${resetArrowHTML()}
        <div class="tt-bg-hype__content">
          <div class="tt-bg-hype__logo" style="animation:breathe 3s ease-in-out infinite">${logoHTML('xl')}</div>
          <div class="tt-bg-hype__tagline" style="animation:fadeDown .5s ease-out .2s both">Next round starting soon!</div>
          ${categories.length > 0 ? `
            <div class="tt-bg-hype__cat-label" style="animation:fadeDown .4s ease-out .25s both">COMING UP NEXT</div>
            <div class="tt-bg-hype__categories" style="animation:slideUp .5s ease-out .3s both">${catPills}</div>
          ` : ''}
          <div class="tt-bg-hype__qr-section" style="animation:slideUp .5s ease-out .5s both">
            ${qrCodeHTML(180)}
            <div class="tt-bg-hype__code-display">
              <div class="tt-bg-hype__code-label">SCAN TO JOIN</div>
              <div class="tt-bg-hype__code-value">${barCode}</div>
              <div class="tt-bg-hype__url">app.taptrivia.tv</div>
            </div>
          </div>
        </div>
      </div>`;
    bindResetArrow();
  }

  /** Confetti HTML generator for between-game podium */
  function confettiHTML(count) {
    const colors = ['#ffd200', '#00d4aa', '#667eea', '#ff4757', '#764ba2', '#f59e0b', '#e879f9'];
    let html = '<div class="tt-confetti">';
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 1.5 + Math.random() * 1.5;
      const size = 6 + Math.random() * 8;
      html += `<div class="tt-confetti__piece" style="left:${left}%;background:${color};animation-delay:${delay}s;animation-duration:${duration}s;width:${size}px;height:${size * 1.4}px"></div>`;
    }
    html += '</div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // BETWEEN-GAME STATE MACHINE
  // ═══════════════════════════════════════════════════════════════

  /** Fetch between-game data and start the 4-phase experience */
  async function startBetweenGameExperience(gameId) {
    if (betweenGameActive) return;
    if (betweenGameLastGameId === gameId) return; // Already ran for this game

    betweenGameLastGameId = gameId;
    betweenGameActive = true;
    betweenGameStartEpoch = Date.now();

    // Fetch data from API
    try {
      betweenGameData = await apiCall('GET', `/game/between?barCode=${barCode}&gameId=${gameId}`);
      if (betweenGameData.error) {
        console.warn('[Between] API error:', betweenGameData.error);
        betweenGameData = null;
      }
    } catch (err) {
      console.error('[Between] Fetch error:', err);
      betweenGameData = null;
    }

    if (!betweenGameData) {
      exitBetweenGameMode();
      return;
    }

    // Build phase list (skip null phases)
    const allPhases = [
      { key: 'podium', data: betweenGameData.podium, render: renderBetweenPodium },
      { key: 'barStandings', data: betweenGameData.barStandings, render: renderBetweenStandings },
      { key: 'national', data: betweenGameData.national, render: renderBetweenNational },
      { key: 'hype', data: betweenGameData.hype, render: renderBetweenHype },
    ];

    betweenGamePhases = allPhases.filter(p => p.data !== null && p.data !== undefined);

    if (betweenGamePhases.length === 0) {
      exitBetweenGameMode();
      return;
    }

    // Distribute 120s across available phases
    const perPhaseMs = Math.floor(betweenGameTotalDuration / betweenGamePhases.length);
    betweenGamePhases.forEach(p => { p.duration = perPhaseMs; });

    betweenGamePhaseIdx = 0;
    renderBetweenGamePhase();
    startBetweenGameTimer();
    startBetweenGameCountdownTick();
    console.log(`[Between] Started ${betweenGamePhases.length} phases, ${perPhaseMs / 1000}s each`);
  }

  /** Render the current between-game phase */
  function renderBetweenGamePhase() {
    if (betweenGamePhaseIdx >= betweenGamePhases.length) {
      exitBetweenGameMode();
      return;
    }
    const phase = betweenGamePhases[betweenGamePhaseIdx];
    currentScreen = `between-${phase.key}`;
    localQuestionNumber = null;
    phase.render(phase.data);
    updateBetweenGameCountdown();
  }

  /** Start timer for current between-game phase */
  function startBetweenGameTimer() {
    stopBetweenGameTimer();
    if (betweenGamePhaseIdx >= betweenGamePhases.length) return;
    const phase = betweenGamePhases[betweenGamePhaseIdx];
    betweenGameTimer = setTimeout(() => {
      betweenGamePhaseIdx++;
      if (betweenGamePhaseIdx >= betweenGamePhases.length) {
        exitBetweenGameMode();
      } else {
        fadeScreenTransition(() => renderBetweenGamePhase());
        startBetweenGameTimer();
      }
    }, phase.duration);
  }

  /** Countdown tick for between-game overlay (1s updates) */
  function startBetweenGameCountdownTick() {
    stopBetweenGameCountdownTick();
    betweenGameCountdownTimer = setInterval(updateBetweenGameCountdown, 1000);
  }

  function stopBetweenGameTimer() {
    if (betweenGameTimer) { clearTimeout(betweenGameTimer); betweenGameTimer = null; }
  }

  function stopBetweenGameCountdownTick() {
    if (betweenGameCountdownTimer) { clearInterval(betweenGameCountdownTimer); betweenGameCountdownTimer = null; }
  }

  /** Exit between-game mode and enter normal rotation */
  function exitBetweenGameMode() {
    betweenGameActive = false;
    stopBetweenGameTimer();
    stopBetweenGameCountdownTick();
    betweenGamePhases = [];
    betweenGamePhaseIdx = 0;
    // Return to normal idle/lobby rotation
    currentScreen = '';
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

    // Do NOT update footer scores during playing — scores update and correct
    // indicators would reveal the answer before the reveal phase.
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
    const total = timer.total || 34;
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
    const el = document.getElementById('tv-results-countdown');
    if (!el) {
      // Countdown element doesn't exist yet — force re-render
      currentScreen = '';
      renderScreen(state);
      return;
    }
    const nextEpoch = getNextFutureGameTime(state.nextGameStartEpoch);
    const secsLeft = Math.max(0, Math.ceil((nextEpoch - getServerNow()) / 1000));
    el.textContent = formatCountdown(secsLeft);
  }

  function updateLobbyCountdown(state) {
    const el = document.getElementById('tv-lobby-countdown');
    if (!el) {
      // Countdown element doesn't exist yet — force re-render
      currentScreen = '';
      renderScreen(state);
      return;
    }
    const nextEpoch = getNextFutureGameTime(state.nextGameStartEpoch);
    const secsLeft = Math.max(0, Math.ceil((nextEpoch - getServerNow()) / 1000));
    el.textContent = formatCountdown(secsLeft);
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
    const TIMER_TOTAL = 35;

    function tick() {
      const cs = getGameState(localGameStartEpoch, getServerNow());

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
    const name = setupLocName.trim();
    if (!name) {
      const locInput = document.getElementById('tt-setup-loc');
      if (locInput) locInput.focus();
      return;
    }

    // Show sending spinner
    setupRegState = 'sending';
    renderSetup();

    const payload = { barName: name };
    if (setupEmail && setupEmail.trim()) payload.ownerEmail = setupEmail.trim();
    const result = await apiCall('POST', '/bar/register', payload);

    if (result.error) {
      setupRegState = 'form';
      renderSetup();
      return;
    }

    // Auto-fill the code boxes on the right side
    barCode = result.barCode;
    barName = result.barName;
    setupCode = barCode.split('');
    setupCodeAutoFilled = true;
    setupRegState = 'sent';
    saveTvConfig();
    renderSetup();
  }

  function makeUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for older webviews
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function activateTV() {
    const codeStr = setupCode.join('').toUpperCase();
    if (codeStr.length < 5) return;

    setupCodeState = 'verifying';
    renderSetup();

    if (!tvDeviceId) tvDeviceId = makeUUID();

    const result = await apiCall('POST', '/tv/activate', {
      barCode: codeStr,
      tvId: tvDeviceId,
      tvPlatform: tvPlatformAnalytics
    });
    if (result.error) {
      setupCodeState = 'error';
      if (!setupCodeAutoFilled) {
        setupCode = ['', '', '', '', ''];
      }
      renderSetup();
      return;
    }

    barCode = result.barCode;
    barName = result.barName;
    if (result.tvId) tvDeviceId = result.tvId;
    saveTvConfig();
    startHeartbeat();

    // Show "You're Live!" for 3 seconds
    setupCodeState = 'activated';
    renderSetup();

    setTimeout(() => {
      startPolling();
      renderScreen({ screen: 'lobby', playerCount: 0, players: [] });
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // SIGNAGE IMPRESSIONS — fire-and-forget POST per slide display.
  // Dedupe key = currentScreen + slide index, so re-renders of the
  // same slide while it's onscreen don't double-log.
  // ═══════════════════════════════════════════════════════════════

  function contextForCurrentScreen() {
    if (currentScreen === 'idle') return 'off_hours_idle';
    if (currentScreen === 'lobby') return 'game_lobby';
    if (currentScreen === 'between' || currentScreen === 'leaderboard') return 'between_rounds';
    if (currentScreen === 'results') return 'results';
    return null; // playing/reveal/category/etc — no signage shown
  }

  function logSignageImpressionIfNew() {
    if (!barCode || !tvDeviceId) return;
    const ctx = contextForCurrentScreen();
    if (!ctx) return;

    let active = getActiveSlides();
    if (active.length === 0) active = getDefaultSignageSlides();
    if (active.length === 0) return;

    const idx = signageCurrentIndex % active.length;
    const slide = active[idx];
    if (!slide) return;

    const signageId = (slide.id || slide.template || 'unknown') + '';
    const key = ctx + ':' + idx + ':' + signageId;
    if (key === lastLoggedSlideKey) return;
    lastLoggedSlideKey = key;

    const apiState = lastApiState || {};
    const players = (apiState.activePlayers || 0) | 0;
    const gameId = apiState.gameId || null;

    // For off-hours, the spec requires concurrent_players=0 and game_id=null.
    // For in-game contexts, the API drives both; if we don't have gameId yet
    // (race on first poll), skip rather than send an invalid request.
    let payload;
    if (ctx === 'off_hours_idle') {
      payload = {
        bar_code: barCode,
        tv_id: tvDeviceId,
        signage_id: signageId,
        content_type: slide.template === '_default_cta' ? 'system' : 'bar_promo',
        displayed_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        duration_ms: (signageRotationSpeed || 60) * 1000,
        context: 'off_hours_idle',
        concurrent_players: 0,
        game_id: null,
        position_in_rotation: idx + 1,
        tv_platform: tvPlatformAnalytics
      };
    } else {
      if (!gameId) return;
      payload = {
        bar_code: barCode,
        tv_id: tvDeviceId,
        signage_id: signageId,
        content_type: slide.template === '_default_cta' ? 'system' : 'bar_promo',
        displayed_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        duration_ms: (signageRotationSpeed || 60) * 1000,
        context: ctx,
        concurrent_players: players,
        game_id: gameId,
        position_in_rotation: idx + 1,
        tv_platform: tvPlatformAnalytics
      };
    }

    fetch(CONFIG.API_BASE + '/signage-impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => console.warn('[Signage] impression failed', err && err.message));
  }

  // ═══════════════════════════════════════════════════════════════
  // HEARTBEAT — every 5 min while paired. Silent on success;
  // logs only on failure. Used by analytics to count active TVs.
  // ═══════════════════════════════════════════════════════════════
  let heartbeatInterval = null;

  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (!tvDeviceId) return;
    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 5 * 60 * 1000);
  }

  async function sendHeartbeat() {
    if (!tvDeviceId) return;
    try {
      await apiCall('POST', '/tv-heartbeat', { tvId: tvDeviceId });
    } catch (err) {
      console.warn('[TV heartbeat] failed:', err && err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POLLING — translates API response → gameState for renderScreen
  // ═══════════════════════════════════════════════════════════════

  let currentPollRate = 0;

  function startPolling() {
    setPollRate(CONFIG.POLL_INTERVAL_IDLE || 5000);
    pollTvState();
  }

  function setPollRate(ms) {
    if (ms === currentPollRate) return;
    currentPollRate = ms;
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollTvState, ms);
  }

  // During idle, poll every 5 min. Schedule a wakeup to ramp back to 5s
  // when the next game is 90s away, so we catch the active→game transition.
  function schedulePreGameWakeup(nextGameStartEpoch) {
    if (preGameWakeupTimer) { clearTimeout(preGameWakeupTimer); preGameWakeupTimer = null; }
    if (!nextGameStartEpoch) return;
    const msUntilWakeup = nextGameStartEpoch - getServerNow() - 90000;
    if (msUntilWakeup <= 0) {
      // Already within 90s — switch to fast polling now
      setPollRate(CONFIG.POLL_INTERVAL_PREGAME || 5000);
      return;
    }
    preGameWakeupTimer = setTimeout(() => {
      preGameWakeupTimer = null;
      console.log('[TV poll] pre-game wakeup — switching to fast poll');
      setPollRate(CONFIG.POLL_INTERVAL_PREGAME || 5000);
      pollTvState();
    }, msUntilWakeup);
    console.log('[TV poll] idle — next wakeup in', Math.round(msUntilWakeup / 1000), 's');
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

    lastApiState = state;

    // Capture signage configuration — clear when location has none (prevents cross-location bleed)
    if (state.signage && state.signage.slides && state.signage.slides.length > 0) {
      signageSlides = state.signage.slides;
      signageRotationSpeed = state.signage.rotationSpeed || 60;
      console.log('[Signage] Loaded', signageSlides.length, 'slides from API, speed:', signageRotationSpeed);
    } else {
      signageSlides = [];
      console.log('[Signage] No custom signage for this location, using defaults');
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

    // Cache nextGameStartEpoch for idle countdown tick
    if (state.nextGameStartEpoch) {
      nextGameStartEpochCached = state.nextGameStartEpoch;
    }

    const gameState = translateApiState(state);
    if (state.phase) console.log('[TV poll] phase:', state.phase, '→ screen:', gameState.screen, 'q:', gameState.questionNumber);

    // Cache for screen rotation
    cacheForRotation(gameState, state);

    // all_off mode or timed-outside-window: signage only, no countdown
    if (state.state === 'idle') {
      setPollRate(CONFIG.POLL_INTERVAL_IDLE);
      exitRotationMode();
      if (betweenGameActive) exitBetweenGameMode();
      if (currentScreen === 'idle') return;
      renderScreen({ ...gameState, screen: 'idle' });
      return;
    }

    // During break: slow polling, full-screen signage (custom or defaults)
    if (state.state === 'break') {
      setPollRate(CONFIG.POLL_INTERVAL_IDLE);
      schedulePreGameWakeup(state.nextGameStartEpoch);
      exitRotationMode();
      if (betweenGameActive) exitBetweenGameMode();
      // Don't re-render if already on idle — avoids flashing on every poll tick
      if (currentScreen === 'idle') return;
      renderScreen({ ...gameState, screen: 'idle' });
      return;
    }

    // Game over — slow polling, between-game experience then rotation
    if (state.state === 'game_over') {
      stopIdleCountdownTick();
      setPollRate(CONFIG.POLL_INTERVAL_IDLE);
      const gameId = state.gameId || '';
      // Start between-game experience if not already running and not yet done for this game
      if (!betweenGameActive && betweenGameLastGameId !== gameId && gameId) {
        schedulePreGameWakeup(state.nextGameStartEpoch);
        startBetweenGameExperience(gameId);
        return;
      }
      // If between-game is active, let it continue (don't interfere)
      if (betweenGameActive) return;
      // Between-game done — enter normal rotation
      schedulePreGameWakeup(state.nextGameStartEpoch);
      handleScreenRotation(gameState);
      return;
    }

    // Active game — fast polling, cancel pre-game wakeup, exit rotation + between-game
    stopIdleCountdownTick();
    if (preGameWakeupTimer) { clearTimeout(preGameWakeupTimer); preGameWakeupTimer = null; }
    setPollRate(CONFIG.POLL_INTERVAL_ACTIVE);
    exitRotationMode();
    if (betweenGameActive) exitBetweenGameMode();
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
      playerCount: apiState.activePlayers || (apiState.barLeaderboard || []).length || 0,
      players: [],
      scores: [],
      question: {},
      timer: { remaining: 0, total: 35 },
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
          subcategory: apiState.subcategory || '',
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
        const elapsed = apiState.elapsedSeconds || 37;
        gs.nextQuestionIn = Math.max(1, Math.ceil(QUESTION_DURATION_MS / 1000 - elapsed));
        gs.funFact = apiState.funFact || '';
      } else {
        // Playing phase (read_time, answer_time, etc.)
        gs.screen = 'playing';
        gs.question = {
          text: apiState.question,
          answers: apiState.answers || [],
          category: apiState.category,
          subcategory: apiState.subcategory || '',
          categoryIcon: getCategoryIcon(apiState.category),
        };
        // Calculate timer (answer window: 3s–31s = 28s countdown)
        const elapsed = apiState.elapsedSeconds || 0;
        const remaining = Math.max(0, 31 - elapsed);
        gs.timer = { remaining, total: 28 };
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

  /** Map category name to emoji icon — covers all 60 topic_tree categories.
   *  Order matters: specific multi-word phrases first, then single keywords,
   *  then broad categories last (first match wins via substring search). */
  function getCategoryIcon(category) {
    if (!category) return '🧠';
    const c = category.toLowerCase();
    const map = {
      // ── Sport leagues (most specific) ──
      'nhl': '🏒', 'nfl': '🏈', 'nba': '🏀', 'mlb': '⚾',
      'ncaa': '🎓', 'nascar': '🏁', 'olympic': '🏅', 'soccer': '⚽',
      // ── Multi-word specifics (before broad keywords) ──
      'disney': '🏰', 'pop culture': '🌟', 'true crime': '🔍',
      'social media': '📱', 'road trip': '🚗', 'national park': '🏕️',
      'board game': '🎮', 'video game': '🎮', 'human body': '🧬',
      'planet earth': '🌎', 'world record': '🤯',
      // ── Specific categories (prevent wrong broad matches) ──
      'broadway': '🎭', 'theater': '🎭', 'performing': '🎭',
      'movie': '🎬', 'hollywood': '🎬', 'blockbuster': '🎬',
      'president': '🏛️', 'government': '⚖️', 'constitution': '⚖️',
      'beer': '🍺', 'wine': '🍺', 'cocktail': '🍺',
      'biology': '🧬', 'chemistry': '⚗️', 'physics': '⚗️',
      'brand': '📢', 'advertising': '📢',
      'building': '🏗️', 'architecture': '🏗️',
      'fashion': '👗', 'holiday': '🎄', 'tradition': '🎄',
      'decade': '📻', 'nostalgia': '📻',
      'medicine': '🩺', 'health': '🩺',
      'river': '🏔️', 'mountain': '🏔️', 'ocean': '🌊',
      'bible': '📖', 'religion': '📖',
      'celebrity': '🌟', 'wrestling': '🥊', 'combat': '🥊',
      'crime': '🔍', 'infamous': '🔍',
      'weird': '🤯', 'travel': '✈️', 'famous cities': '✈️',
      'business': '💼', 'entrepreneur': '💼',
      'invention': '💡', 'environment': '🌎',
      'weather': '🌦️', 'geology': '🌋',
      'streaming': '📺', 'television': '📺',
      'song': '🎵', 'lyric': '🎵', 'album': '🎵',
      'computer': '💻', 'internet': '💻',
      'landmark': '📍', 'flag': '🗺️',
      // ── Broad categories (last — fallback matches) ──
      'science': '🔬', 'history': '📜', 'geography': '🌍',
      'sport': '⚽', 'entertainment': '🎭', 'music': '🎵',
      'art': '🎨', 'literature': '📚', 'technology': '💻', 'tech': '💻',
      'nature': '🌿', 'food': '🍕', 'dining': '🍕',
      'tv': '📺', 'gaming': '🎮', 'animal': '🐾', 'wildlife': '🐾',
      'math': '🔢', 'number': '🔢', 'logic': '🔢',
      'politic': '🏛️', 'space': '🚀', 'astrono': '🚀',
      'myth': '⚡', 'folklore': '⚡',
      'language': '💬', 'word': '💬', 'phrase': '💬',
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
    { name: 'Sarah M', score: 12450 }, { name: 'Chris K', score: 10875 },
    { name: 'Jake', score: 9640 }, { name: 'Mike D', score: 8920 },
    { name: 'Lisa P', score: 7350 }, { name: 'Tom W', score: 6800 },
    { name: 'Amy R', score: 5920 }, { name: 'Dan B', score: 5100 },
    { name: 'Nicole S', score: 4800 }, { name: 'Ryan T', score: 4200 },
    { name: 'Emma L', score: 3900 }, { name: 'Josh P', score: 3400 },
  ];

  const DEMO_SIGNAGE_SLIDES = [
    {
      template: 'specials',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🍺',
        label: "Tonight's Specials",
        headline: 'Thirsty Thursday',
        subheadline: 'All Day Deals',
        featuredName: 'Margarita Pitcher',
        featuredDesc: 'House lime, Cointreau, fresh squeeze',
        featuredPrice: '$18',
        menuItems: [
          { icon: '🍺', name: 'Draft Beers', desc: 'All domestics', price: '$3' },
          { icon: '🍸', name: 'Well Drinks', desc: 'Vodka, rum, whiskey', price: '$4' },
          { icon: '🍗', name: 'Wings Basket', desc: '12 ct. buffalo or BBQ', price: '$8' },
          { icon: '🌮', name: 'Loaded Nachos', desc: 'Beef, cheese, jalapeños', price: '$10' },
        ],
      },
    },
    {
      template: 'happyhour',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🍹',
        timeRange: '4 PM – 7 PM',
        frequency: 'Every Weekday',
        deals: [
          { deal: '50% OFF', item: 'All Draft Beers', color: '#f59e0b' },
          { deal: '$5', item: 'House Wine & Sangria', color: '#e879f9' },
          { deal: '$6', item: 'Any Appetizer', color: '#00d4aa' },
        ],
      },
    },
    {
      template: 'event',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🧠',
        eventName: 'TapTrivia Night',
        when: 'Every Thursday · 8 PM',
        details: 'Free to play · Win prizes · Teams welcome',
        prizes: [
          { place: '1st Place', prize: '$50 Tab', emoji: '🥇' },
          { place: '2nd Place', prize: '$25 Tab', emoji: '🥈' },
          { place: '3rd Place', prize: 'Free Appetizer', emoji: '🥉' },
        ],
      },
    },
    {
      template: 'brand',
      enabled: true,
      schedule: { days: [] },
      data: {
        tagline: 'Cold Drinks · Good Times · Live Trivia',
        hours: [
          { label: 'Mon – Thu', hours: '4 PM – 12 AM' },
          { label: 'Fri – Sat', hours: '4 PM – 2 AM' },
          { label: 'Sunday', hours: '12 PM – 10 PM' },
        ],
      },
    },
    {
      template: 'announcement',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🎉',
        headline: 'Patio Season Is Here!',
        message: 'We just expanded our outdoor seating — 20 new spots with string lights, fire pits, and full service. Come check it out this weekend!',
        subtext: 'Grand opening Saturday at noon · Live music all day',
      },
    },
    {
      template: 'sports',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🏈',
        headline: 'Game Day Sunday',
        matchup: 'Panthers vs Falcons',
        when: 'This Sunday · 1:00 PM Kickoff',
        promo: '$3 Bud Light · $5 Wings · $8 Pitchers',
        tagline: 'Every screen. Every game. Best seat in Brevard.',
      },
    },
    {
      template: 'custom',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🎶',
        headline: 'Live Music Friday',
        body: 'Local favorite Jake Morrison is back with acoustic covers and originals. Grab a drink, grab a seat — it\'s going to be a good one.',
        items: [
          { emoji: '🎸', text: 'Starts at 9 PM' },
          { emoji: '🍻', text: '$4 craft pints all night' },
          { emoji: '🎟️', text: 'No cover charge' },
        ],
      },
    },
  ];

  // Between-game demo data
  const DEMO_BETWEEN_DATA = {
    podium: {
      players: DEMO_PLAYERS.slice(0, 10).map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 })),
      questionCount: 15,
      playerCount: 12
    },
    barStandings: {
      yourBar: { name: barName || "Mo's Tavern", city: 'Brevard', state: 'NC', rank: 6, index: 7620, delta: 5, nationalRank: 46, totalBars: 312 },
      stateRanking: [
        { name: "The Whiskey Jar", city: 'Asheville', rank: 4, index: 8100, delta: 2 },
        { name: "Oskar Blues", city: 'Brevard', rank: 5, index: 7850, delta: -1 },
        { name: barName || "Mo's Tavern", city: 'Brevard', rank: 6, index: 7620, delta: 5 },
        { name: "Sierra Nevada", city: 'Mills River', rank: 7, index: 7400, delta: 0 },
        { name: "Wicked Weed", city: 'Asheville', rank: 8, index: 7200, delta: -3 },
      ],
      stateName: 'North Carolina'
    },
    national: {
      top25: Array.from({ length: 25 }, (_, i) => ({
        name: ['Sarah M', 'Chris K', 'Jake', 'Mike D', 'Lisa P', 'Tom W', 'Amy R', 'Dan B', 'Nicole S', 'Ryan T', 'Emma L', 'Josh P', 'Alex G', 'Maria H', 'Kevin W', 'Laura S', 'James T', 'Sofia R', 'David M', 'Olivia K', 'Ethan B', 'Mia C', 'Noah L', 'Ava P', 'Liam J'][i],
        bar: ['The Pub', 'Sports Grill', 'Brew House'][i % 3],
        city: ['Austin, TX', 'Denver, CO', 'Nashville, TN', 'Portland, OR'][i % 4],
        score: Math.round(98420 - i * 1800 + Math.random() * 200)
      })),
      stats: { players: 12400, games: 847, questions: 4200000, bars: 312 },
      cutoffScore: 55500,
      yourBarBest: { name: 'Sarah M', score: 42100 }
    },
    hype: {
      nextGameId: 'GAME#demo',
      categories: ['Entertainment', 'Sports', 'Science', 'Geography', 'History'],
      startsAt: Date.now() + 120000
    }
  };

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
      timer: { remaining: 14, total: 34 },
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
      timer: { remaining: 0, total: 35 },
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'leaderboard',
      questionNumber: 7,
      totalQuestions: 15,
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'between',
      questionNumber: 7,
      totalQuestions: 15,
      nextQuestionIn: 5,
      scores: DEMO_PLAYERS,
    },
    {
      screen: 'results',
      totalQuestions: 15,
      playerCount: 12,
      scores: DEMO_PLAYERS,
    },
    { screen: 'between-podium', _betweenData: 'podium' },
    { screen: 'between-barStandings', _betweenData: 'barStandings' },
    { screen: 'between-national', _betweenData: 'national' },
    { screen: 'between-hype', _betweenData: 'hype' },
  ];

  async function runDemoMode() {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const barParam = params.get('bar');

    // Use bar param, or localStorage, or fallback
    const demoBarCode = barParam || barCode || '9CK6T';

    // Fetch real bar data from API
    const barData = await apiCall('GET', `/bar/${demoBarCode}`);
    if (barData && !barData.error) {
      barCode = barData.barCode || demoBarCode;
      barName = barData.barName || barName || "Mo's Tavern";
    } else {
      barCode = demoBarCode;
      barName = barName || "Mo's Tavern";
    }

    // Fetch real signage from TV state API
    const tvState = await apiCall('GET', `/game/tv-state?barCode=${barCode}`);
    if (tvState && !tvState.error && tvState.signage) {
      signageSlides = tvState.signage.slides || [];
      signageRotationSpeed = tvState.signage.rotationSpeed || 60;
      if (tvState.logoHash) {
        barLogoHash = tvState.logoHash;
        barLogoUrl = tvState.logoUrl || null;
      }
      console.log('[Demo] Loaded', signageSlides.length, 'real signage slides for', barName);
    } else {
      // Fallback to mock data if API fails
      signageSlides = DEMO_SIGNAGE_SLIDES;
      signageRotationSpeed = 60;
      console.log('[Demo] API unavailable, using mock signage');
    }
    signageCurrentIndex = 0;

    let idx = 0;
    if (screenParam) {
      const found = DEMO_SCREENS.findIndex(s => s.screen === screenParam);
      if (found >= 0) idx = found;
    }

    function showNext() {
      currentScreen = ''; // Force re-render
      localQuestionNumber = null; // Reset question tracking for demo
      const demoScreen = DEMO_SCREENS[idx];
      if (demoScreen._betweenData) {
        // Render between-game screen directly from demo data
        const renderers = { podium: renderBetweenPodium, barStandings: renderBetweenStandings, national: renderBetweenNational, hype: renderBetweenHype };
        const key = demoScreen._betweenData;
        betweenGameData = DEMO_BETWEEN_DATA;
        renderers[key](DEMO_BETWEEN_DATA[key]);
        updateBetweenGameCountdown();
        currentScreen = demoScreen.screen;
      } else {
        renderScreen(demoScreen);
      }
      idx = (idx + 1) % DEMO_SCREENS.length;
    }

    showNext();

    // Auto-advance unless a specific screen was requested
    if (!screenParam) {
      setInterval(showNext, 6000);
    }

    // Listen for screen-switch messages from parent (demo.html toggle)
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'tt-demo-screen') {
        const found = DEMO_SCREENS.find(s => s.screen === e.data.screen);
        if (found) {
          currentScreen = '';
          localQuestionNumber = null;
          renderScreen(found);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  async function init() {
    if (!tvDeviceId) {
      tvDeviceId = crypto.randomUUID();
      saveTvConfig();
    }

    // Demo mode — cycle through screens with mock data
    if (isDemoMode()) {
      runDemoMode();
      return;
    }

    // Accept ?bar=CODE param to set bar code (used by demo.html embed)
    const urlParams = new URLSearchParams(window.location.search);
    const barParam = urlParams.get('bar');
    if (barParam && barParam !== barCode) {
      barCode = barParam.toUpperCase();
      saveTvConfig();
    }

    // If we have a stored bar code, verify and enter lobby
    if (barCode) {
      const bar = await apiCall('GET', `/bar/${barCode}`);
      if (bar && !bar.error && bar.status === 'active') {
        barName = bar.barName;
        saveTvConfig();
        if (tvDeviceId) startHeartbeat();
        startPolling();
        return;
      }
      // Invalid code — clear and show setup
      barCode = '';
      barName = '';
      saveTvConfig();
    }

    renderScreen({ screen: 'setup' });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ═══════════════════════════════════════════════════════════════
  // EMBED TOGGLE — demo.html can force idle (signage) or live (real polling)
  // ═══════════════════════════════════════════════════════════════
  let embedOverrideIdle = false;

  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'tt-demo-screen') return;

    if (e.data.screen === 'idle') {
      // Force signage mode — pause polling, show signage
      embedOverrideIdle = true;
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      exitRotationMode();
      currentScreen = '';
      const active = getActiveSlides();
      if (active.length > 0) {
        renderScreen({ screen: 'idle' });
        startSignageRotation();
      } else {
        renderScreen({ screen: 'lobby', playerCount: 0, players: [] });
      }
    } else if (e.data.screen === 'live') {
      // Resume real polling
      embedOverrideIdle = false;
      currentScreen = '';
      startPolling();
    }
  });

  // Expose renderScreen globally for testing
  window.TapTrivia = { renderScreen };

})();
