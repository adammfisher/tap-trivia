// TapTrivia TV — Samsung Tizen wrapper
// Full-screen iframe to tv.taptrivia.tv with multi-layer screensaver prevention

(function () {
  var TV_URL = 'https://tv.taptrivia.tv';
  var RETRY_MS = 10000;
  var KEEP_ALIVE_INTERVAL_MS = 300000; // Re-assert screen-on every 5 min

  var iframe = document.getElementById('tvApp');
  var errorOverlay = document.getElementById('errorOverlay');

  // ── Error handling with auto-retry ──
  var retryTimer = null;

  function showError() {
    errorOverlay.classList.remove('hidden');
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function () {
      errorOverlay.classList.add('hidden');
      iframe.src = TV_URL;
    }, RETRY_MS);
  }

  iframe.addEventListener('error', showError);
  iframe.addEventListener('load', function () {
    errorOverlay.classList.add('hidden');
  });

  // ── Layer 1: Tizen Power API — keep screen on ──
  function requestScreenOn() {
    try {
      tizen.power.request('SCREEN', 'SCREEN_NORMAL');
      console.log('[TapTrivia] Tizen SCREEN_NORMAL requested');
    } catch (e) {
      console.log('[TapTrivia] Tizen power API not available:', e.message);
    }
  }

  // ── Layer 2: Samsung screensaver off API ──
  function disableSamsungScreenSaver() {
    try {
      webapis.appcommon.setScreenSaver(
        webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF
      );
      console.log('[TapTrivia] Samsung screensaver disabled');
    } catch (e) {
      console.log('[TapTrivia] Samsung screensaver API not available:', e.message);
    }
  }

  // ── Layer 3: Screen Wake Lock API (Chromium) ──
  var wakeLock = null;

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('[TapTrivia] Wake Lock acquired');
        wakeLock.addEventListener('release', function () {
          console.log('[TapTrivia] Wake Lock released, re-acquiring...');
          setTimeout(requestWakeLock, 1000);
        });
      }
    } catch (e) {
      console.log('[TapTrivia] Wake Lock failed:', e.message);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      requestScreenOn();
    }
  });

  // ── Layer 4: Silent video fallback ──
  function startSilentVideo() {
    try {
      var v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.setAttribute('loop', '');
      v.muted = true;
      v.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
      v.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA9RtZGF0AAACrwYF//+r3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAFPZYiEACD/2lu4PtiAGCZiIJmO35BneLS4/AKawbwF3gS81VgCN/Uni2aH0T92Hgz2Vnkf/EBcwAMBAAMAAAMAAAMAAAawAAAAzUGaJGxDP/6eEAAAAwAAAwAAAwAfQAAAAHhBnkJ4j/8AAAMBAAqFAAAAPkGeYkU0TCP/AAADAAADAAADAAADAAADAAADABNAAAAAGkGegkmoQz/+nhAAAAMAAAMAAAMABWAAAAAbQZ6iRTRMI/8AAAMAAAMAAAMAAAMAAAMAAYAAAAAZQZ7CeIj/AAADAAADAAADAAADAAADAACpAAAAE0Ge4kU0TCP/AAADAAADAAADAAEAAAATQZ8CeIj/AAADAAADAAADAAEAAAATQZ8iRTRMI/8AAAMAAAMAAAMAAQAAABFAH0J4iP8AAAMAAAMAAAMAAa0AAAARAANGaWYP/p4QAAADAAADAGEAAAANQBNGaWYP/p4QAAADAABhAAAADUATRmlmD/6eEAAAAwAAYQ==';
      document.body.appendChild(v);
      v.play().then(function () {
        console.log('[TapTrivia] Silent video playing');
      }).catch(function (e) {
        console.log('[TapTrivia] Silent video failed:', e.message);
      });
      // Monitor and restart
      setInterval(function () {
        if (v.paused) { v.play().catch(function () {}); }
      }, 30000);
    } catch (e) {
      console.log('[TapTrivia] Silent video error:', e.message);
    }
  }

  // ── Initialize all layers ──
  requestScreenOn();
  disableSamsungScreenSaver();
  requestWakeLock();
  startSilentVideo();

  // Re-assert periodically (belt and suspenders)
  setInterval(function () {
    requestScreenOn();
    disableSamsungScreenSaver();
  }, KEEP_ALIVE_INTERVAL_MS);

  // ── Handle Tizen back key — prevent app exit ──
  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 10009) { // Tizen BACK key
      e.preventDefault();
      e.stopPropagation();
    }
  });

  console.log('[TapTrivia] Samsung Tizen app initialized');
})();
