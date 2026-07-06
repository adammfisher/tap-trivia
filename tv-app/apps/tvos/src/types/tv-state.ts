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
  | 'results'
  | 'between-podium'
  | 'between-standings'
  | 'between-national'
  | 'between-hype'
  // Between-games rotation (Roku 5-slide flow)
  | 'round-complete'
  | 'play-taptrivia'
  | 'coming-up';

export interface BetweenGameData {
  podium: {
    players: Array<{ name: string; score: number; rank: number }>;
    questionCount: number;
    playerCount: number;
  } | null;
  barStandings: {
    yourBar: {
      name: string;
      city: string;
      state: string;
      rank: number;
      index: number;
      delta: number;
      nationalRank: number;
      totalBars: number;
    };
    stateRanking: Array<{
      name: string;
      city: string;
      rank: number;
      index: number;
      delta: number;
    }>;
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
  funFact?: string;

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

  // Between-game experience
  betweenData?: BetweenGameData | null;

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
