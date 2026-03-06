import type { TvLeaderboardEntry, SignageSlide } from '../services/api';

export type TVScreen =
  | 'setup'
  | 'idle'
  | 'lobby'
  | 'getready'
  | 'category'
  | 'playing'
  | 'reveal'
  | 'between'
  | 'leaderboard'
  | 'results';

export interface TVState {
  screen: TVScreen;
  barCode: string;
  barName: string;

  // Game info
  gameId?: string;
  activePlayers: number;
  questionNumber?: number;
  totalQuestions: number;

  // Question data
  question?: string | null;
  category?: string | null;
  subcategory?: string;
  difficulty?: number;
  answers?: string[];
  correctIndex?: number;
  eliminated?: Array<{ index: number; answer: string; display: string }>;
  answerPercentages?: number[] | null;
  pctCorrect?: number | null;

  // Timer / points
  gameStartEpoch?: number;
  elapsedSeconds?: number;
  currentPointsAvailable?: number;
  timerSeconds?: number;

  // Leaderboard
  barLeaderboard: TvLeaderboardEntry[];
  globalLeaderboard: TvLeaderboardEntry[];

  // Next game
  nextGameStartEpoch?: number;
  secondsUntilNextGame: number;

  // Signage
  signageSlides: SignageSlide[];
  signageRotationSpeed: number;
  signageCurrentIndex: number;
  logoUrl?: string | null;
  logoHash?: string | null;

  // Connection
  consecutiveErrors: number;
  isConnected: boolean;
}

export const INITIAL_TV_STATE: TVState = {
  screen: 'setup',
  barCode: '',
  barName: '',
  activePlayers: 0,
  totalQuestions: 15,
  barLeaderboard: [],
  globalLeaderboard: [],
  secondsUntilNextGame: 0,
  signageSlides: [],
  signageRotationSpeed: 60,
  signageCurrentIndex: 0,
  consecutiveErrors: 0,
  isConnected: true,
};
