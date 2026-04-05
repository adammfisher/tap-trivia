/**
 * Keepalive for Vega OS — Lightweight PlayerSession heartbeat.
 *
 * PREVIOUS APPROACH (caused OOM kill on 1GB Fire TV Stick):
 *   4 layers: KMC heartbeat every 5s + AudioPlayer + PlayerSession + TimeoutManager
 *   Running Video + AudioPlayer doubled native media pipeline memory (~200MB+).
 *   Manual KMC heartbeat conflicted with Video's internal MediaControlStateUtil.
 *   High CPU from 5s intervals caused load average >8 → cgroup OOM kill.
 *
 * CURRENT APPROACH (minimal memory footprint):
 *   The AudioPlayer in App.tsx handles the PRIMARY keepalive:
 *   - AUDIO_PLAYBACK session (weight 130) via setMediaControlFocus()
 *   - Plays local silence.wav from bundled assets (no CDN dependency)
 *   - Self-recovery on failure with consecutive-failure counter
 *
 *   This module only adds:
 *   1. PlayerSession.setPlaybackState(PLAYING) every 30s — lightweight backup
 *   2. TimeoutManager.setLifespan(PERMANENT) — one-time call, no ongoing cost
 *
 *   Total overhead: one setInterval at 30s, no native media pipelines.
 */

let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
let trackPosition = 0;

// PlayerSession TurboModule — lightweight native call
function setupPlayerSession() {
  try {
    const { PlayerSession } = require('@amazon-devices/react-native-kepler');
    try {
      PlayerSession.create();
    } catch {}
    return PlayerSession;
  } catch (e: any) {
    console.log('[KEEPALIVE] PlayerSession import failed:', e?.message || e);
    return null;
  }
}

function sendPlayerSessionState(playerSession: any) {
  if (!playerSession) return;
  try {
    playerSession.setPlaybackState({
      state: 'PlayerStatePlaying',
      supportedMediaOps: 259,
      errorCode: 'ErrorAppNone',
      errorCodeString: '',
      timeRangeData: { minSeekMs: 0, maxSeekMs: 86400000, trackPositionMs: trackPosition },
      audioFocus: 'AudioFocusPrimary',
      currentPlaybackSpeed: 1,
      repeatMode: 'PlayerRepeatModeNone',
      shuffleMode: 'PlayerShuffleModeNone',
      trackRating: 'PlayerRatingNone',
      audioTrackAvailableLanguages: ['English'],
      captionTrackInfo: [{ captionLanguage: 'English', captionMimeType: '' }],
    });
  } catch {}
}

// TimeoutManager — one-time PERMANENT lifespan request
function setupTimeoutManager() {
  try {
    const { TimeoutManager, LIFESPAN_POLICY } =
      require('@amazon-devices/react-native-kepler');
    TimeoutManager.setLifespan('TapTriviaTV', LIFESPAN_POLICY.PERMANENT);
    console.log('[KEEPALIVE] TimeoutManager set to PERMANENT');
  } catch (e: any) {
    console.log('[KEEPALIVE] TimeoutManager failed:', e?.message || e);
  }
}

const SilentAudioPlayer = {
  startSilentAudio(_componentInstance?: any) {
    if (keepaliveInterval) return;

    console.log('[KEEPALIVE] Starting lightweight keepalive (PlayerSession every 30s)');

    // One-time setup
    setupTimeoutManager();
    const playerSession = setupPlayerSession();
    sendPlayerSessionState(playerSession);

    // Single 30s interval — minimal CPU/memory overhead
    keepaliveInterval = setInterval(() => {
      trackPosition += 30000;
      sendPlayerSessionState(playerSession);
    }, 30000);
  },

  stopSilentAudio() {
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
  },
};

export default SilentAudioPlayer;
