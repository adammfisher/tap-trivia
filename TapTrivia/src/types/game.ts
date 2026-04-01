export type GamePhase =
  | 'idle'
  | 'waiting'
  | 'countdown'
  | 'category'
  | 'question'
  | 'reveal'
  | 'leaderboard'
  | 'finished';

export interface GameState {
  gamePhase: GamePhase;
  gameId: string | null;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  pointsAvailable: number;
  totalScore: number;
  rank: number;
  rankChange: number;
  question: QuestionData | null;
  answerResult: AnswerResult | null;
  leaderboard: LeaderboardEntry[];
  playerStats: PlayerStats;
  barName: string;
  barCode: string;
  countdownValue: number;
  playerCount: number;
}

export interface QuestionData {
  questionId: string;
  question: string;
  answers: string[];
  category: string;
  subcategory: string;
  categoryEmoji: string;
  difficulty: 1 | 2 | 3;
  eliminatedIndices: number[];
  funFact: string;
}

export interface AnswerResult {
  selectedIndex: number;
  correct: boolean;
  pointsAwarded: number;
  lockedInPoints: number;
  correctAnswer: string;
  correctIndex: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  movement: number;
  isYou: boolean;
}

export interface PlayerStats {
  correct: number;
  wrong: number;
  timeout: number;
  streak: number;
  bestStreak: number;
}

export interface SavedBar {
  code: string;
  name: string;
  lastPlayed: string;
  type?: 'bar' | 'group';
}

/** POST /bar/join response (location join) */
export interface BarJoinResponse {
  barCode: string;
  barName: string;
  activePlayers: number;
  type?: 'bar' | 'group';
  displayName?: string;
  nameCollision?: boolean;
}

/** POST /group/create response */
export interface CreateGroupResponse {
  barCode: string;
  barName: string;
  type: 'group';
}

/** GET /game/current response */
export interface CurrentGameResponse {
  gameId?: string;
  startTimeEpoch?: number;
  status: 'active' | 'scheduled' | 'completed' | 'no_game';
  currentQuestionNumber?: number;
  totalQuestions?: number;
  secondsUntilStart?: number | null;
  nextGameStartEpoch?: number;
  activePlayers?: number;
  message?: string;
}

/** GET /game/{gameId}/question/{questionNumber} response */
export interface QuestionResponse {
  questionId: string;
  question: string;
  answers: string[];
  category: string;
  subcategory?: string;
  difficulty: number;
  eliminateOrder: number[];
  correctIndex?: number;
  funFact?: string;
}

/** POST /game/{gameId}/answer response */
export interface SubmitAnswerResponse {
  correct: boolean;
  pointsAwarded: number;
  correctAnswer: string;
  totalGameScore: number;
}

/** GET /game/{gameId}/leaderboard response */
export interface LeaderboardResponse {
  leaders: Array<{
    rank: number;
    playerId: string;
    playerName: string;
    score: number;
    barName?: string;
  }>;
  totalPlayers: number;
  you?: {
    rank: number;
    playerId: string;
    score: number;
  };
}
