import type {
  BarJoinResponse,
  CreateGroupResponse,
  CurrentGameResponse,
  QuestionResponse,
  SubmitAnswerResponse,
  LeaderboardResponse,
} from '../types/game';

const API_BASE = 'https://api.taptrivia.tv';

interface ApiError {
  error: string;
  message: string;
}

type ApiResult<T> = T | ApiError;

function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return (result as ApiError).error !== undefined;
}

async function apiCall<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'API_ERROR', message: data.message || `HTTP ${res.status}` };
    }
    return data as T;
  } catch {
    return { error: 'NETWORK_ERROR', message: 'Network error — check your connection.' };
  }
}

/**
 * POST /bar/join — validates bar code AND joins the player.
 * Requires X-Player-ID header.
 */
export async function joinBar(
  barCode: string,
  deviceId: string,
): Promise<ApiResult<BarJoinResponse>> {
  return apiCall<BarJoinResponse>('POST', '/bar/join', { barCode }, {
    'X-Player-ID': deviceId,
  });
}

/**
 * PUT /player/{playerId} — create or update player profile.
 * Used for setting displayName with server-side dedup.
 */
export interface UpdatePlayerResponse {
  playerId: string;
  displayName: string;
  currentBarCode: string | null;
  gamesPlayed: number;
  totalPoints: number;
  nameWasAdjusted?: boolean;
}

export async function updatePlayer(
  playerId: string,
  displayName: string,
  currentBarCode?: string,
): Promise<ApiResult<UpdatePlayerResponse>> {
  const body: Record<string, unknown> = { displayName };
  if (currentBarCode) body.currentBarCode = currentBarCode;
  return apiCall<UpdatePlayerResponse>('PUT', `/player/${encodeURIComponent(playerId)}`, body, {
    'X-Player-ID': playerId,
  });
}

/**
 * GET /game/current — check for active/upcoming game.
 */
export async function getCurrentGame(): Promise<ApiResult<CurrentGameResponse>> {
  return apiCall<CurrentGameResponse>('GET', '/game/current');
}

/**
 * GET /game/{gameId}/question/{questionNumber} — fetch question data.
 */
export async function getQuestion(
  gameId: string,
  questionNumber: number,
  deviceId: string,
): Promise<ApiResult<QuestionResponse>> {
  return apiCall<QuestionResponse>(
    'GET',
    `/game/${encodeURIComponent(gameId)}/question/${questionNumber}`,
    undefined,
    { 'X-Player-ID': deviceId },
  );
}

/**
 * POST /game/{gameId}/answer — submit answer for current question.
 */
export async function submitAnswer(
  gameId: string,
  questionNumber: number,
  selectedAnswer: string,
  playerName: string,
  clientElapsedMs: number,
  deviceId: string,
  barCode?: string,
): Promise<ApiResult<SubmitAnswerResponse>> {
  return apiCall<SubmitAnswerResponse>(
    'POST',
    `/game/${encodeURIComponent(gameId)}/answer`,
    { questionNumber, selectedAnswer, playerName, clientElapsedMs, barCode: barCode || '' },
    { 'X-Player-ID': deviceId },
  );
}

/**
 * GET /game/{gameId}/leaderboard — fetch leaderboard.
 */
export async function getLeaderboard(
  gameId: string,
  type: 'bar' | 'global',
  barCode?: string,
  deviceId?: string,
): Promise<ApiResult<LeaderboardResponse>> {
  let path = `/game/${encodeURIComponent(gameId)}/leaderboard?type=${type}`;
  if (barCode) path += `&barCode=${encodeURIComponent(barCode)}`;
  const headers: Record<string, string> = {};
  if (deviceId) headers['X-Player-ID'] = deviceId;
  return apiCall<LeaderboardResponse>('GET', path, undefined, headers);
}

/**
 * POST /feedback — submit player feedback.
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  feedbackId: string;
}

export async function submitFeedback(params: {
  message: string;
  category: string;
  email?: string;
  nickname?: string;
  barCode?: string;
  platform?: string;
  appVersion?: string;
  deviceId?: string;
}): Promise<ApiResult<SubmitFeedbackResponse>> {
  const hdrs: Record<string, string> = {};
  if (params.deviceId) hdrs['X-Player-ID'] = params.deviceId;
  return apiCall<SubmitFeedbackResponse>('POST', '/feedback', {
    message: params.message,
    category: params.category,
    email: params.email,
    nickname: params.nickname,
    barCode: params.barCode,
    platform: params.platform,
    appVersion: params.appVersion,
  }, hdrs);
}

/**
 * POST /group/create — create a persistent friend group.
 */
export async function createGroup(
  groupName: string,
  deviceId: string,
): Promise<ApiResult<CreateGroupResponse>> {
  return apiCall<CreateGroupResponse>('POST', '/group/create', { groupName }, {
    'X-Player-ID': deviceId,
  });
}

export { isApiError };
export type { ApiError, ApiResult };
