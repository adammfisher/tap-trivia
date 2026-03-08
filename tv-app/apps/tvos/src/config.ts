export const API_BASE = 'https://api.taptrivia.tv';
export const PLAYER_APP_URL = 'https://play.taptrivia.tv';

export const POLL_INTERVAL_ACTIVE = 2000;
export const POLL_INTERVAL_IDLE = 5000;

export const MAX_ERRORS_BEFORE_OVERLAY = 10;

export const ROTATION_DURATIONS: Record<string, number> = {
  results: 60000,
  idle: 60000,
  lobby: 60000,
};

export const BETWEEN_PHASE_DURATION = 30000;  // 30s per phase
export const BETWEEN_TOTAL_DURATION = 120000; // 120s total
