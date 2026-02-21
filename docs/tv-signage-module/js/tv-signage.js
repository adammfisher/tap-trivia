// ================================================================
// tv-signage.js — TapTrivia TV App Signage Rendering Module
// ================================================================
//
// DROP-IN MODULE for the existing tv-app.
// Renders bar owner's digital signage slides in two contexts:
//   1. Full-screen (1920x1080) during break/idle/off-hours
//   2. In-game right panel (~340px wide) during active games
//
// INTEGRATION:
//   1. Add <script src="js/tv-signage.js"></script> to tv-app/index.html
//   2. Add <link rel="stylesheet" href="css/tv-signage.css"> to tv-app/index.html
//   3. In app.js, when tv-state response includes signage data:
//      - Break state:  TapSignage.renderFullScreen(container, signageConfig, barInfo)
//      - Active game:  TapSignage.renderPanel(panelContainer, signageConfig, barInfo)
//      - State change: TapSignage.stop() to clean up timers
//
// DEPENDENCIES: None beyond what tv-app already has.
// ================================================================

'use strict';

const TapSignage = (function () {

  // ----- STATE -----
  let _rotationTimer = null;
  let _currentIndex = 0;
  let _currentSlides = [];
  let _currentContext = null; // 'fullscreen' | 'panel'
  let _currentContainer = null;
  let _barInfo = null;
  let _cachedLogoImg = null;
  let _cachedLogoHash = null;

  // ----- CONSTANTS -----
  const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // ----- HELPERS -----

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function w(alpha) {
    return `rgba(255,255,255,${alpha})`;
  }

  function getTodaySlides(slides) {
    const today = DAY_NAMES[new Date().getDay()];
    return (slides || []).filter(function (s) {
      if (!s.enabled) return false;
      if (!s.schedule || !s.schedule.days) return true; // no schedule = always show
      if (s.schedule.allDay || s.schedule.days.length === 0) return true;
      return s.schedule.days.indexOf(today) !== -1;
    });
  }

  // Returns the bar's logo element HTML.
  // In production: uses actual uploaded logo from S3 via logoUrl.
  // Fallback: renders a styled text placeholder from barName.
  function barLogoHTML(size, barInfo) {
    if (barInfo && barInfo.logoUrl) {
      // Production: real logo from S3/CloudFront
      // The TV app should resolve this to a full URL like:
      //   https://tv.taptrivia.tv/logos/{barCode}.png
      // or whatever CloudFront path serves the logo bucket.
      var url = barInfo.logoFullUrl || barInfo.logoUrl;
      return '<div class="ts-bar-logo" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * 0.2) + 'px;">' +
        '<img src="' + esc(url) + '" alt="' + esc(barInfo.barName || '') + '" style="width:100%;height:100%;object-fit:contain;border-radius:' + Math.round(size * 0.2) + 'px;" onerror="this.parentElement.innerHTML=TapSignage._logoFallback(' + size + ')">' +
        '</div>';
    }
    return _logoFallbackHTML(size, barInfo);
  }

  function _logoFallbackHTML(size, barInfo) {
    var name = (barInfo && barInfo.barName) || 'Bar';
    var parts = name.split(' ');
    var line1 = parts[0] || '';
    var line2 = parts.slice(1).join(' ') || '';
    return '<div class="ts-bar-logo ts-bar-logo-fallback" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * 0.2) + 'px;">' +
      '<span class="ts-logo-name" style="font-size:' + Math.round(size * 0.25) + 'px;">' + esc(line1) + '</span>' +
      (line2 ? '<span class="ts-logo-sub" style="font-size:' + Math.round(size * 0.12) + 'px;">' + esc(line2) + '</span>' : '') +
      '</div>';
  }

  // Public for the onerror fallback on logo img
  function _logoFallback(size) {
    return _logoFallbackHTML(size, _barInfo);
  }

  function qrCodeSVG(size) {
    // Deterministic pseudo-random QR code visual (matches the prototype)
    var grid = 25, cellSize = size / grid;
    var rects = '';
    var seed = 48271;

    function inFinder(cx, cy, x, y) { return x >= cx && x < cx + 7 && y >= cy && y < cy + 7; }
    function inBorder(cx, cy, x, y) { return inFinder(cx, cy, x, y) && !(x > cx && x < cx + 6 && y > cy && y < cy + 6); }
    function inCenter(cx, cy, x, y) { return x >= cx + 2 && x < cx + 5 && y >= cy + 2 && y < cy + 5; }

    for (var y = 0; y < grid; y++) {
      for (var x = 0; x < grid; x++) {
        var fill = false;
        if (inBorder(0, 0, x, y) || inCenter(0, 0, x, y) ||
            inBorder(18, 0, x, y) || inCenter(18, 0, x, y) ||
            inBorder(0, 18, x, y) || inCenter(0, 18, x, y)) {
          fill = true;
        } else if (inFinder(0, 0, x, y) || inFinder(18, 0, x, y) || inFinder(0, 18, x, y)) {
          fill = false;
        } else {
          seed = ((seed * 1103515245 + 12345) >>> 0);
          if (seed % 100 < 42) fill = true;
        }
        if (fill) {
          var rx = Math.round(cellSize * 0.12 * 100) / 100;
          rects += '<rect x="' + (x * cellSize) + '" y="' + (y * cellSize) + '" width="' + (cellSize + 0.5) + '" height="' + (cellSize + 0.5) + '" fill="#1e0f4a" rx="' + rx + '"/>';
        }
      }
    }

    return '<div style="background:#fff;border-radius:8px;padding:8px;display:inline-block;">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + rects + '</svg></div>';
  }

  function taptriviaLogoHTML(size) {
    var s = { sm: 17, md: 22, lg: 32, xl: 44 }[size] || 22;
    return '<span style="font-family:\'Fredoka\',sans-serif;font-size:' + s + 'px;font-weight:700;letter-spacing:-0.5px;line-height:1;">' +
      '<span style="color:#fff;">Tap</span>' +
      '<span style="background:linear-gradient(135deg,#f7971e,#ffd200,#ffe066);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Trivia</span>' +
      '</span>';
  }

  function orbsHTML() {
    return '<div class="ts-orbs">' +
      '<div class="ts-orb ts-orb-blue"></div>' +
      '<div class="ts-orb ts-orb-red"></div>' +
      '</div>';
  }

  // ----- FULL-SCREEN SHARED ELEMENTS -----

  function signageHeaderHTML(barInfo) {
    var name = esc((barInfo && barInfo.barName) || 'TapTrivia Bar');
    var loc = '';
    if (barInfo && barInfo.city) loc = esc(barInfo.city + (barInfo.state ? ', ' + barInfo.state : ''));
    return '<div class="ts-signage-header">' +
      '<div class="ts-header-left">' +
        barLogoHTML(44, barInfo) +
        '<div>' +
          '<div class="ts-header-name">' + name + '</div>' +
          (loc ? '<div class="ts-header-loc">' + loc + '</div>' : '') +
        '</div>' +
      '</div>' +
      taptriviaLogoHTML('sm') +
      '</div>';
  }

  function tvQRBadgeHTML(position, barInfo) {
    var pos = (position === 'br') ? 'right:20px;' : 'left:20px;';
    var code = (barInfo && barInfo.barCode) || 'XXXX';
    return '<div class="ts-qr-badge" style="' + pos + '">' +
      qrCodeSVG(72) +
      '<div>' +
        '<div class="ts-qr-title">Get the App!</div>' +
        '<div class="ts-qr-url">taptrivia.tv</div>' +
        '<div class="ts-qr-code"><span class="ts-qr-code-label">JOIN</span> <span class="ts-qr-code-value">' + esc(code) + '</span></div>' +
      '</div>' +
      '</div>';
  }

  // Bottom "Powered by TapTrivia" bar (used by Brand template)
  function poweredByHTML() {
    return '<div class="ts-powered-by">' +
      '<div class="ts-powered-inner">' +
        taptriviaLogoHTML('sm') +
        '<div class="ts-powered-sep"></div>' +
        '<span class="ts-powered-text">Powered by TapTrivia</span>' +
      '</div>' +
      '</div>';
  }


  // ================================================================
  // FULL-SCREEN RENDERERS (1920x1080, designed at 960x540 2x scale)
  // ================================================================

  var fullScreenRenderers = {};

  // --- SPECIALS ---
  fullScreenRenderers.specials = function (d, barInfo) {
    var menuHTML = '';
    (d.menuItems || []).forEach(function (item) {
      menuHTML += '<div class="ts-fs-menu-item">' +
        '<span class="ts-fs-menu-icon">' + (item.icon || item.emoji || '🍽️') + '</span>' +
        '<div class="ts-fs-menu-info">' +
          '<div class="ts-fs-menu-name">' + esc(item.name) + '</div>' +
          '<div class="ts-fs-menu-desc">' + esc(item.desc) + '</div>' +
        '</div>' +
        '<div class="ts-fs-menu-price">' + esc(item.price) + '</div>' +
        '</div>';
    });

    return '<div class="ts-fullscreen ts-specials">' +
      '<div class="ts-fs-bg ts-bg-specials">' + orbsHTML() + '</div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-split">' +
        '<div class="ts-fs-left">' +
          '<div class="ts-fs-eyebrow ts-color-amber">' + (d.emoji || '🍺') + ' ' + esc(d.label || "Today's Specials") + '</div>' +
          '<div class="ts-fs-title">' + esc(d.headline || '') + '<br><span class="ts-gold-text">' + esc(d.subheadline || '') + '</span></div>' +
          '<div class="ts-fs-featured-card">' +
            '<div class="ts-fs-featured-label">Featured</div>' +
            '<div class="ts-fs-featured-row">' +
              '<div>' +
                '<div class="ts-fs-featured-name">' + esc(d.featuredName) + '</div>' +
                '<div class="ts-fs-featured-desc">' + esc(d.featuredDesc) + '</div>' +
              '</div>' +
              '<div class="ts-fs-featured-price">' + esc(d.featuredPrice) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ts-fs-right">' + menuHTML + '</div>' +
      '</div>' +
      tvQRBadgeHTML('br', barInfo) +
      '</div>';
  };

  // --- HAPPY HOUR ---
  fullScreenRenderers.happyhour = function (d, barInfo) {
    var dealsHTML = '';
    (d.deals || []).forEach(function (deal) {
      dealsHTML += '<div class="ts-fs-deal-card">' +
        '<div class="ts-fs-deal-amount" style="color:' + (deal.color || '#f59e0b') + ';">' + esc(deal.deal) + '</div>' +
        '<div class="ts-fs-deal-item">' + esc(deal.item) + '</div>' +
        '</div>';
    });

    return '<div class="ts-fullscreen ts-happyhour">' +
      '<div class="ts-fs-bg ts-bg-happyhour"><div class="ts-orb ts-orb-amber"></div></div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-center">' +
        '<div class="ts-fs-eyebrow ts-color-amber ts-neon-pulse">' + (d.emoji || '🍹') + ' Happy Hour</div>' +
        '<div class="ts-fs-hero-text">' + esc(d.timeRange) + '</div>' +
        '<div class="ts-fs-subtitle">' + esc(d.frequency) + '</div>' +
        '<div class="ts-fs-deals-row">' + dealsHTML + '</div>' +
      '</div>' +
      tvQRBadgeHTML('bl', barInfo) +
      '</div>';
  };

  // --- EVENT ---
  fullScreenRenderers.event = function (d, barInfo) {
    var prizesHTML = '';
    (d.prizes || []).forEach(function (p) {
      prizesHTML += '<div class="ts-fs-prize-card">' +
        '<div class="ts-fs-prize-emoji">' + (p.emoji || '🏆') + '</div>' +
        '<div class="ts-fs-prize-place">' + esc(p.place) + '</div>' +
        '<div class="ts-fs-prize-desc">' + esc(p.prize) + '</div>' +
        '</div>';
    });

    return '<div class="ts-fullscreen ts-event">' +
      '<div class="ts-fs-bg ts-bg-event">' + orbsHTML() + '</div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-center">' +
        '<div class="ts-fs-big-emoji ts-anim-zoom">' + (d.emoji || '🎧') + '</div>' +
        '<div class="ts-fs-eyebrow ts-color-blue">' + esc(d.when) + '</div>' +
        '<div class="ts-fs-event-title">' + esc(d.eventName) + '</div>' +
        '<div class="ts-fs-subtitle">' + esc(d.details) + '</div>' +
        '<div class="ts-fs-prizes-row">' + prizesHTML + '</div>' +
      '</div>' +
      tvQRBadgeHTML('bl', barInfo) +
      '</div>';
  };

  // --- BRAND ---
  fullScreenRenderers.brand = function (d, barInfo) {
    var hoursHTML = '';
    (d.hours || []).forEach(function (h) {
      hoursHTML += '<div class="ts-fs-hours-item">' +
        '<div class="ts-fs-hours-label">' + esc(h.label) + '</div>' +
        '<div class="ts-fs-hours-value">' + esc(h.hours) + '</div>' +
        '</div>';
    });

    return '<div class="ts-fullscreen ts-brand">' +
      '<div class="ts-fs-bg ts-bg-brand">' + orbsHTML() + '</div>' +
      '<div class="ts-fs-content ts-fs-center">' +
        '<div class="ts-anim-breathe">' + barLogoHTML(140, barInfo) + '</div>' +
        '<div class="ts-fs-brand-name">' + esc((barInfo && barInfo.barName) || 'Your Bar') + '</div>' +
        '<div class="ts-fs-brand-tagline">' + esc(d.tagline) + '</div>' +
        '<div class="ts-fs-brand-divider"></div>' +
        '<div class="ts-fs-hours-row">' + hoursHTML + '</div>' +
      '</div>' +
      poweredByHTML() +
      '</div>';
  };

  // --- ANNOUNCEMENT ---
  fullScreenRenderers.announcement = function (d, barInfo) {
    return '<div class="ts-fullscreen ts-announcement">' +
      '<div class="ts-fs-bg ts-bg-announcement">' + orbsHTML() + '</div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-center ts-fs-padded">' +
        '<div class="ts-fs-big-emoji">' + (d.emoji || '📢') + '</div>' +
        '<div class="ts-fs-announce-title">' + esc(d.headline) + '</div>' +
        '<div class="ts-fs-announce-body">' + esc(d.message) + '</div>' +
        (d.subtext ? '<div class="ts-fs-announce-sub">' + esc(d.subtext) + '</div>' : '') +
      '</div>' +
      tvQRBadgeHTML('bl', barInfo) +
      '</div>';
  };

  // --- SPORTS ---
  fullScreenRenderers.sports = function (d, barInfo) {
    return '<div class="ts-fullscreen ts-sports">' +
      '<div class="ts-fs-bg ts-bg-sports">' + orbsHTML() + '</div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-center">' +
        '<div class="ts-fs-big-emoji">' + (d.emoji || '🏈') + '</div>' +
        '<div class="ts-fs-eyebrow ts-color-red">' + esc(d.headline) + '</div>' +
        '<div class="ts-fs-sports-matchup">' + esc(d.matchup) + '</div>' +
        '<div class="ts-fs-subtitle">' + esc(d.when) + '</div>' +
        '<div class="ts-fs-promo-card"><div class="ts-fs-promo-text">' + esc(d.promo) + '</div></div>' +
        (d.tagline ? '<div class="ts-fs-sports-tagline">' + esc(d.tagline) + '</div>' : '') +
      '</div>' +
      tvQRBadgeHTML('bl', barInfo) +
      '</div>';
  };

  // --- CUSTOM ---
  fullScreenRenderers.custom = function (d, barInfo) {
    var itemsHTML = '';
    if (d.items && d.items.length > 0) {
      itemsHTML = '<div class="ts-fs-custom-items">';
      d.items.forEach(function (item) {
        itemsHTML += '<div class="ts-fs-custom-pill">' +
          '<span class="ts-fs-custom-pill-emoji">' + (item.emoji || '•') + '</span>' +
          '<span class="ts-fs-custom-pill-text">' + esc(item.text) + '</span>' +
          '</div>';
      });
      itemsHTML += '</div>';
    }

    return '<div class="ts-fullscreen ts-custom">' +
      '<div class="ts-fs-bg ts-bg-custom">' + orbsHTML() + '</div>' +
      signageHeaderHTML(barInfo) +
      '<div class="ts-fs-content ts-fs-center">' +
        '<div class="ts-fs-big-emoji ts-anim-zoom">' + (d.emoji || '✨') + '</div>' +
        '<div class="ts-fs-custom-headline">' + esc(d.headline) + '</div>' +
        '<div class="ts-fs-custom-body">' + esc(d.body) + '</div>' +
        itemsHTML +
      '</div>' +
      tvQRBadgeHTML('bl', barInfo) +
      '</div>';
  };


  // ================================================================
  // PANEL RENDERERS (~340px wide, in-game right sidebar)
  // ================================================================

  function panelHeaderHTML(barInfo) {
    var name = esc((barInfo && barInfo.barName) || 'TapTrivia Bar');
    var loc = '';
    if (barInfo && barInfo.city) loc = esc(barInfo.city + (barInfo.state ? ', ' + barInfo.state : ''));
    return '<div class="ts-panel-header">' +
      barLogoHTML(30, barInfo) +
      '<div>' +
        '<div class="ts-panel-header-name">' + name + '</div>' +
        (loc ? '<div class="ts-panel-header-loc">' + loc + '</div>' : '') +
      '</div>' +
      '</div>';
  }

  function panelQRHTML(barInfo) {
    var code = (barInfo && barInfo.barCode) || 'XXXX';
    return '<div class="ts-panel-qr">' +
      qrCodeSVG(44) +
      '<div>' +
        '<div class="ts-panel-qr-title">Join Trivia!</div>' +
        '<div class="ts-panel-qr-url">taptrivia.tv</div>' +
        '<div class="ts-panel-qr-code"><span class="ts-panel-qr-label">CODE</span> <span class="ts-panel-qr-value">' + esc(code) + '</span></div>' +
      '</div>' +
      '</div>';
  }

  var panelRenderers = {};

  // --- PANEL: SPECIALS ---
  panelRenderers.specials = function (d, barInfo) {
    var menuHTML = '';
    (d.menuItems || []).forEach(function (item) {
      menuHTML += '<div class="ts-pn-menu-item">' +
        '<span class="ts-pn-menu-icon">' + (item.icon || item.emoji || '🍽️') + '</span>' +
        '<div class="ts-pn-menu-info">' +
          '<div class="ts-pn-menu-name">' + esc(item.name) + '</div>' +
          '<div class="ts-pn-menu-desc">' + esc(item.desc) + '</div>' +
        '</div>' +
        '<div class="ts-pn-menu-price">' + esc(item.price) + '</div>' +
        '</div>';
    });

    return '<div class="ts-panel ts-anim-panel-slide">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-eyebrow ts-color-amber">' + (d.emoji || '🍺') + ' ' + esc(d.label || "Tonight's Specials") + '</div>' +
      '<div class="ts-pn-featured">' +
        '<div class="ts-pn-featured-row">' +
          '<div>' +
            '<div class="ts-pn-featured-name">' + esc(d.featuredName) + '</div>' +
            '<div class="ts-pn-featured-desc">' + esc(d.featuredDesc) + '</div>' +
          '</div>' +
          '<div class="ts-pn-featured-price">' + esc(d.featuredPrice) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ts-pn-menu-list">' + menuHTML + '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };

  // --- PANEL: HAPPY HOUR ---
  panelRenderers.happyhour = function (d, barInfo) {
    var dealsHTML = '';
    (d.deals || []).forEach(function (deal) {
      dealsHTML += '<div class="ts-pn-deal">' +
        '<div class="ts-pn-deal-amount" style="color:' + (deal.color || '#f59e0b') + ';">' + esc(deal.deal) + '</div>' +
        '<div class="ts-pn-deal-item">' + esc(deal.item) + '</div>' +
        '</div>';
    });

    return '<div class="ts-panel ts-anim-panel-slide">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-eyebrow" style="color:#e879f9;">' + (d.emoji || '🍹') + ' Happy Hour</div>' +
      '<div class="ts-pn-hero-sm">' + esc(d.timeRange) + '</div>' +
      '<div class="ts-pn-subtitle">' + esc(d.frequency) + '</div>' +
      '<div class="ts-pn-deals-col">' + dealsHTML + '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };

  // --- PANEL: EVENT ---
  panelRenderers.event = function (d, barInfo) {
    var prizesHTML = '';
    (d.prizes || []).forEach(function (p) {
      prizesHTML += '<div class="ts-pn-prize-item">' +
        '<span class="ts-pn-prize-emoji">' + (p.emoji || '🏆') + '</span>' +
        '<div class="ts-pn-prize-info">' +
          '<div class="ts-pn-prize-place">' + esc(p.place) + '</div>' +
          '<div class="ts-pn-prize-desc">' + esc(p.prize) + '</div>' +
        '</div>' +
        '</div>';
    });

    return '<div class="ts-panel ts-anim-panel-slide">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-eyebrow ts-color-blue">' + (d.emoji || '🎧') + ' Coming Up</div>' +
      '<div class="ts-pn-event-center">' +
        '<div class="ts-pn-big-emoji">' + (d.emoji || '🎧') + '</div>' +
        '<div class="ts-pn-eyebrow-sm ts-color-blue">' + esc(d.when) + '</div>' +
        '<div class="ts-pn-event-name">' + esc(d.eventName) + '</div>' +
        '<div class="ts-pn-event-details">' + esc(d.details) + '</div>' +
        '<div class="ts-pn-prizes-col">' + prizesHTML + '</div>' +
      '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };

  // --- PANEL: BRAND ---
  panelRenderers.brand = function (d, barInfo) {
    var hoursHTML = '';
    (d.hours || []).forEach(function (h) {
      hoursHTML += '<div class="ts-pn-hours-row">' +
        '<span class="ts-pn-hours-label">' + esc(h.label) + '</span>' +
        '<span class="ts-pn-hours-value">' + esc(h.hours) + '</span>' +
        '</div>';
    });

    return '<div class="ts-panel ts-anim-panel-slide ts-panel-brand-center">' +
      '<div class="ts-anim-breathe">' + barLogoHTML(80, barInfo) + '</div>' +
      '<div class="ts-pn-brand-name">' + esc((barInfo && barInfo.barName) || 'Your Bar') + '</div>' +
      '<div class="ts-pn-brand-tagline">' + esc(d.tagline) + '</div>' +
      '<div class="ts-pn-brand-divider"></div>' +
      '<div class="ts-pn-hours-list">' + hoursHTML + '</div>' +
      '<div style="margin-top:auto;">' + panelQRHTML(barInfo) + '</div>' +
      '</div>';
  };

  // --- PANEL: ANNOUNCEMENT ---
  panelRenderers.announcement = function (d, barInfo) {
    return '<div class="ts-panel ts-anim-panel-slide">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-announce-center">' +
        '<div class="ts-pn-big-emoji">' + (d.emoji || '📢') + '</div>' +
        '<div class="ts-pn-announce-title">' + esc(d.headline) + '</div>' +
        '<div class="ts-pn-announce-body">' + esc(d.message) + '</div>' +
        (d.subtext ? '<div class="ts-pn-announce-sub">' + esc(d.subtext) + '</div>' : '') +
      '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };

  // --- PANEL: SPORTS ---
  panelRenderers.sports = function (d, barInfo) {
    return '<div class="ts-panel ts-anim-panel-slide ts-panel-sports-center">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-sports-center">' +
        '<div class="ts-pn-sports-emoji">' + (d.emoji || '🏈') + '</div>' +
        '<div class="ts-pn-eyebrow-sm ts-color-red">' + esc(d.headline) + '</div>' +
        '<div class="ts-pn-sports-matchup">' + esc(d.matchup) + '</div>' +
        '<div class="ts-pn-sports-when">' + esc(d.when) + '</div>' +
        '<div class="ts-pn-promo-card"><div class="ts-pn-promo-text">' + esc(d.promo) + '</div></div>' +
        (d.tagline ? '<div class="ts-pn-sports-tagline">' + esc(d.tagline) + '</div>' : '') +
      '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };

  // --- PANEL: CUSTOM ---
  panelRenderers.custom = function (d, barInfo) {
    var itemsHTML = '';
    if (d.items && d.items.length > 0) {
      itemsHTML = '<div class="ts-pn-custom-items">';
      d.items.forEach(function (item) {
        itemsHTML += '<div class="ts-pn-custom-item">' +
          '<span class="ts-pn-custom-item-emoji">' + (item.emoji || '•') + '</span>' +
          '<span class="ts-pn-custom-item-text">' + esc(item.text) + '</span>' +
          '</div>';
      });
      itemsHTML += '</div>';
    }

    return '<div class="ts-panel ts-anim-panel-slide">' +
      panelHeaderHTML(barInfo) +
      '<div class="ts-pn-custom-center">' +
        '<div class="ts-pn-big-emoji">' + (d.emoji || '✨') + '</div>' +
        '<div class="ts-pn-custom-headline">' + esc(d.headline) + '</div>' +
        '<div class="ts-pn-custom-body">' + esc(d.body) + '</div>' +
        itemsHTML +
      '</div>' +
      panelQRHTML(barInfo) +
      '</div>';
  };


  // ================================================================
  // ROTATION CONTROLLER
  // ================================================================

  function stop() {
    if (_rotationTimer) {
      clearInterval(_rotationTimer);
      _rotationTimer = null;
    }
    _currentSlides = [];
    _currentIndex = 0;
    _currentContext = null;
    _currentContainer = null;
  }

  /**
   * Render full-screen signage into a container element.
   * Call this when tv-state is 'break' and signage.enabled is true.
   *
   * @param {HTMLElement} container - The DOM element to render into (should be 1920x1080 or scaled equivalent)
   * @param {Object} signageConfig - The signage object from tv-state: { slides:[], rotationSpeed:15, enabled:true }
   * @param {Object} barInfo - Bar data: { barCode, barName, city, state, logoUrl, logoHash }
   * @returns {boolean} true if signage was rendered, false if no slides available (caller should show idle screen)
   */
  function renderFullScreen(container, signageConfig, barInfo) {
    if (!signageConfig || !signageConfig.enabled || !signageConfig.slides) return false;

    var slides = getTodaySlides(signageConfig.slides);
    if (slides.length === 0) return false;

    // Stop any existing rotation
    stop();

    _barInfo = barInfo;
    _currentSlides = slides;
    _currentContext = 'fullscreen';
    _currentContainer = container;
    _currentIndex = 0;

    // Render first slide immediately
    _renderCurrentSlide();

    // Start rotation if more than 1 slide
    if (slides.length > 1) {
      var speed = (signageConfig.rotationSpeed || 15) * 1000;
      _rotationTimer = setInterval(function () {
        _currentIndex = (_currentIndex + 1) % _currentSlides.length;
        _renderCurrentSlide();
      }, speed);
    }

    return true;
  }

  /**
   * Render panel signage into a sidebar container element.
   * Call this when tv-state is 'active_game' and signage.enabled is true.
   *
   * @param {HTMLElement} container - The panel DOM element (~340px wide)
   * @param {Object} signageConfig - The signage object from tv-state
   * @param {Object} barInfo - Bar data
   * @returns {boolean} true if signage was rendered, false if no slides
   */
  function renderPanel(container, signageConfig, barInfo) {
    if (!signageConfig || !signageConfig.enabled || !signageConfig.slides) return false;

    var slides = getTodaySlides(signageConfig.slides);
    if (slides.length === 0) return false;

    // If we're already running panel rotation, just let it continue
    // (don't restart on every 2s poll)
    if (_currentContext === 'panel' && _currentContainer === container &&
        _currentSlides.length === slides.length) {
      return true;
    }

    stop();

    _barInfo = barInfo;
    _currentSlides = slides;
    _currentContext = 'panel';
    _currentContainer = container;
    _currentIndex = 0;

    _renderCurrentSlide();

    if (slides.length > 1) {
      var speed = (signageConfig.rotationSpeed || 15) * 1000;
      _rotationTimer = setInterval(function () {
        _currentIndex = (_currentIndex + 1) % _currentSlides.length;
        _renderCurrentSlide();
      }, speed);
    }

    return true;
  }

  function _renderCurrentSlide() {
    if (!_currentContainer || !_currentSlides.length) return;

    var slide = _currentSlides[_currentIndex];
    var template = slide.template;
    var data = slide.data || {};
    var html = '';

    if (_currentContext === 'fullscreen') {
      var renderer = fullScreenRenderers[template];
      if (renderer) {
        html = renderer(data, _barInfo);
      } else {
        console.warn('[TapSignage] Unknown template:', template);
        html = fullScreenRenderers.custom({ emoji: '📺', headline: 'TapTrivia', body: '' }, _barInfo);
      }
    } else {
      var panelRenderer = panelRenderers[template];
      if (panelRenderer) {
        html = panelRenderer(data, _barInfo);
      } else {
        console.warn('[TapSignage] Unknown panel template:', template);
        html = panelRenderers.custom({ emoji: '📺', headline: 'TapTrivia', body: '' }, _barInfo);
      }
    }

    // Crossfade transition
    _currentContainer.style.opacity = '0';
    setTimeout(function () {
      _currentContainer.innerHTML = html;
      _currentContainer.style.opacity = '1';
    }, 300); // 300ms fade out, then swap, then 300ms CSS transition fades in
  }

  /**
   * Check if signage is currently active (rendering slides)
   */
  function isActive() {
    return _currentContext !== null && _currentSlides.length > 0;
  }

  /**
   * Get the number of slides available for today
   */
  function getSlideCount(signageConfig) {
    if (!signageConfig || !signageConfig.enabled || !signageConfig.slides) return 0;
    return getTodaySlides(signageConfig.slides).length;
  }


  // ================================================================
  // PUBLIC API
  // ================================================================

  return {
    renderFullScreen: renderFullScreen,
    renderPanel: renderPanel,
    stop: stop,
    isActive: isActive,
    getSlideCount: getSlideCount,

    // Exposed for logo image onerror fallback
    _logoFallback: _logoFallback
  };

})();
