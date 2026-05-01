import { API_BASE } from '../config';

let _serverTimeOffset = 0;

export function getServerNow(): number {
  return Date.now() + _serverTimeOffset;
}

export async function apiCall<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const requestStart = Date.now();
  const res = await fetch(`${API_BASE}${path}`, opts);
  // Tolerate empty response bodies (e.g. /tv-heartbeat returns 200
  // with no body). JSON.parse on '' throws SyntaxError, so read text
  // first and only parse when there's content.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  const dateHeader = res.headers.get('Date');
  if (dateHeader && res.ok) {
    const serverTime = Date.parse(dateHeader);
    if (!isNaN(serverTime)) {
      const clientMidpoint = (requestStart + Date.now()) / 2;
      _serverTimeOffset = serverTime - clientMidpoint;
    }
  }

  if (!res.ok) {
    const msg = (data && (data as { message?: string }).message) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function getTvState(barCode: string) {
  return apiCall<TvStateResponse>(
    'GET',
    `/game/tv-state?barCode=${encodeURIComponent(barCode)}`,
  );
}

export async function registerBar(barName: string, ownerEmail?: string) {
  return apiCall<{ barCode: string; barName: string }>(
    'POST',
    '/bar/register',
    { barName, ...(ownerEmail ? { ownerEmail } : {}) },
  );
}

export async function activateTV(barCode: string, tvId: string) {
  return apiCall<{ barCode: string; barName: string; tvId: string }>(
    'POST',
    '/tv/activate',
    { barCode, tvId, tvPlatform: 'appletv' },
  );
}

export async function tvHeartbeat(tvId: string) {
  // Best-effort, no body returned. Log is handled by the caller.
  return apiCall<unknown>('POST', '/tv-heartbeat', { tvId });
}

export interface SignageImpressionBody {
  bar_code: string;
  tv_id: string;
  signage_id: string;
  content_type: string;
  displayed_at_utc: string;
  duration_ms: number;
  context: 'game_lobby' | 'between_rounds' | 'results' | 'off_hours_idle';
  concurrent_players: number;
  game_id: string | null;
  position_in_rotation: number;
  tv_platform: string;
}

export async function signageImpression(body: SignageImpressionBody) {
  return apiCall<{ impression_id: string }>('POST', '/signage-impression', body as unknown as Record<string, unknown>);
}

export async function getBetweenGameData(barCode: string, gameId: string) {
  return apiCall<BetweenGameDataResponse>(
    'GET',
    `/game/between?barCode=${encodeURIComponent(barCode)}&gameId=${encodeURIComponent(gameId)}`,
  );
}

export interface BetweenGameDataResponse {
  podium: {
    players: Array<{ name: string; score: number; rank: number }>;
    questionCount: number;
    playerCount: number;
  } | null;
  barStandings: {
    yourBar: {
      name: string; city: string; state: string;
      rank: number; index: number; delta: number;
      nationalRank: number; totalBars: number;
    };
    stateRanking: Array<{ name: string; city: string; rank: number; index: number; delta: number }>;
    stateName: string;
  } | null;
  national: {
    top25: Array<{ name: string; bar: string; city: string; score: number }>;
    stats: { players: number; games: number; questions: number; bars: number };
    cutoffScore: number;
    yourBarBest: { name: string; score: number } | null;
  } | null;
  hype: {
    nextGameId: string;
    categories: string[];
    startsAt: number;
  } | null;
}

// API response types

export interface TvLeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  barName?: string;
  isCurrentCorrect?: boolean;
  movement?: number;
  streak?: number;
}

export interface SignageSlide {
  template: 'specials' | 'happyhour' | 'event' | 'brand' | 'announcement' | 'sports' | 'custom';
  enabled: boolean;
  days?: string[];
  title?: string;
  emoji?: string;
  headline?: string;
  message?: string;
  subtext?: string;
  tagline?: string;
  items?: Array<{
    name?: string;
    price?: string;
    icon?: string;
    emoji?: string;
    label?: string;
    featured?: boolean;
    place?: string;
    value?: string;
    text?: string;
    day?: string;
    hours?: string;
  }>;
  featured?: { name?: string; price?: string; icon?: string };
  customLabel?: string;
  customEmoji?: string;
  when?: string;
  frequency?: string;
  deals?: Array<{ name?: string; value?: string; deal?: string; item?: string; color?: string }>;
  hours?: Array<{ day?: string; hours?: string; label?: string }>;
  matchup?: string;
  promo?: string;
  body?: string;
  prize?: Array<{ place?: string; emoji?: string; label?: string }>;
}

export interface TvStateResponse {
  state: 'break' | 'active_game' | 'game_over';
  barCode: string;
  barName: string;
  activePlayers: number;
  gameId?: string;
  gameStartEpoch?: number;
  questionNumber?: number;
  totalQuestions?: number;
  phase?: string;
  question?: string | null;
  category?: string | null;
  subcategory?: string;
  difficulty?: number;
  answers?: string[];
  correctIndex?: number;
  correctAnswer?: string | null;
  eliminated?: Array<{ index: number; answer: string; display: string }>;
  answerPercentages?: number[] | null;
  pctCorrect?: number | null;
  avgAnswerTimeSec?: number | null;
  currentPointsAvailable?: number;
  elapsedSeconds?: number;
  barLeaderboard?: TvLeaderboardEntry[];
  globalLeaderboard?: TvLeaderboardEntry[];
  lastGameBarLeaderboard?: TvLeaderboardEntry[];
  lastGameGlobalLeaderboard?: TvLeaderboardEntry[];
  nextGameStartEpoch?: number;
  secondsUntilNextGame?: number | null;
  showBarCode?: boolean;
  playerAppUrl?: string;
  signage?: { slides: SignageSlide[]; rotationSpeed?: number } | null;
  logoUrl?: string | null;
  logoHash?: string | null;
  funFact?: string;
}
