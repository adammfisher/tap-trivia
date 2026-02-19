/**
 * GameContext — shared game state across all game screens.
 * Runs the game loop (tick every 250ms), fetches questions from API,
 * submits answers, fetches leaderboards. All screens read from this context.
 */
import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  GamePhase,
  GameState,
  QuestionData,
  AnswerResult,
  LeaderboardEntry,
  PlayerStats,
} from '../types/game';
import { getGameState as clockGetGameState, TOTAL_QUESTIONS } from '../utils/game-clock';
import type { QuestionPhase } from '../utils/game-clock';
import { calculatePoints } from '../utils/scoring';
import { getQuestion, submitAnswer, getLeaderboard, isApiError } from '../services/api';

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  entertainment: '\u{1F3AC}', science: '\u{1F52C}', history: '\u{1F4DC}',
  geography: '\u{1F30D}', sports: '\u26BD', music: '\u{1F3B5}',
  art: '\u{1F3A8}', literature: '\u{1F4DA}', technology: '\u{1F4BB}',
  food: '\u{1F355}', animals: '\u{1F43E}', nature: '\u{1F33F}',
  politics: '\u{1F3DB}\uFE0F', government: '\u{1F3DB}\uFE0F', math: '\u{1F522}',
  language: '\u{1F4DD}', 'pop culture': '\u{1F31F}', movies: '\u{1F3A5}',
  television: '\u{1F4FA}', gaming: '\u{1F3AE}', space: '\u{1F680}',
};

function getCategoryEmoji(category: string): string {
  const lower = (category || '').toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '\u{1F9E0}';
}

/** Map game-clock questionPhase to mobile GamePhase */
function mapPhase(clockPhase: string, questionPhase?: QuestionPhase): GamePhase {
  if (clockPhase === 'pre_game') return 'waiting';
  if (clockPhase === 'post_game') return 'finished';
  if (!questionPhase) return 'waiting';
  switch (questionPhase) {
    case 'category_splash': return 'category';
    case 'read_time':
    case 'all_answers':
    case 'hint_1':
    case 'hint_2':
      return 'question';
    case 'reveal': return 'reveal';
    case 'scores': return 'leaderboard';
    default: return 'waiting';
  }
}

interface GameContextValue {
  gameState: GameState;
  startGame: (gameId: string, startTimeEpoch: number, barCode: string, barName: string, deviceId: string, nickname: string) => void;
  doSubmitAnswer: (answerIndex: number) => void;
  resetGame: () => void;
}

const INITIAL_STATS: PlayerStats = { correct: 0, wrong: 0, timeout: 0, streak: 0, bestStreak: 0 };

const INITIAL_STATE: GameState = {
  gamePhase: 'idle',
  gameId: null,
  questionNumber: 0,
  totalQuestions: TOTAL_QUESTIONS,
  timeRemaining: 0,
  pointsAvailable: 0,
  totalScore: 0,
  rank: 0,
  rankChange: 0,
  question: null,
  answerResult: null,
  leaderboard: [],
  playerStats: INITIAL_STATS,
  barName: '',
  barCode: '',
  countdownValue: 5,
  playerCount: 0,
};

const GameContext = createContext<GameContextValue>({
  gameState: INITIAL_STATE,
  startGame: () => {},
  doSubmitAnswer: () => {},
  resetGame: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  // Mutable refs for the game loop (avoid stale closures)
  const gameRef = useRef({
    gameId: null as string | null,
    startTimeEpoch: 0,
    barCode: '',
    barName: '',
    deviceId: '',
    nickname: '',
    currentQuestionNumber: 0,
    questionData: null as QuestionData | null,
    rawQuestionData: null as { eliminateOrder: number[]; correctIndex?: number } | null,
    answerResult: null as AnswerResult | null,
    totalScore: 0,
    fetchingQuestion: false,
    submitting: false,
    leaderboardFetched: false,
    leaderboard: [] as LeaderboardEntry[],
    playerStats: { ...INITIAL_STATS },
    rank: 0,
    rankChange: 0,
    playerCount: 0,
    lastPhase: '' as string,
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameId || !g.startTimeEpoch) return;

    const clockState = clockGetGameState(g.startTimeEpoch, Date.now());
    const mobilePhase = mapPhase(clockState.gamePhase, clockState.questionPhase);

    // New question detected
    if (clockState.gamePhase === 'active' && clockState.questionNumber !== g.currentQuestionNumber) {
      // Track timeout for previous question
      if (g.currentQuestionNumber > 0 && !g.answerResult) {
        g.playerStats.timeout += 1;
        g.playerStats.streak = 0;
      }

      g.currentQuestionNumber = clockState.questionNumber!;
      g.questionData = null;
      g.rawQuestionData = null;
      g.answerResult = null;
      g.fetchingQuestion = false;
      g.submitting = false;
      g.leaderboardFetched = false;
    }

    // Fetch question data if needed
    if (
      clockState.gamePhase === 'active' &&
      clockState.questionNumber &&
      !g.questionData &&
      !g.fetchingQuestion
    ) {
      g.fetchingQuestion = true;
      getQuestion(g.gameId!, clockState.questionNumber, g.deviceId).then((result) => {
        g.fetchingQuestion = false;
        if (!isApiError(result)) {
          const qd: QuestionData = {
            questionId: result.questionId,
            question: result.question,
            answers: result.answers,
            category: result.category,
            subcategory: result.subcategory || '',
            categoryEmoji: getCategoryEmoji(result.category),
            difficulty: (result.difficulty as 1 | 2 | 3) || 1,
            eliminatedIndices: [],
          };
          g.questionData = qd;
          g.rawQuestionData = {
            eliminateOrder: result.eliminateOrder || [],
            correctIndex: result.correctIndex,
          };
        }
      });
    }

    // Fetch leaderboard during scores phase
    if (
      clockState.questionPhase === 'scores' &&
      !g.leaderboardFetched &&
      g.gameId
    ) {
      g.leaderboardFetched = true;
      const isSolo = g.barCode === 'SOLO';
      getLeaderboard(g.gameId, isSolo ? 'global' : 'bar', isSolo ? undefined : g.barCode, g.deviceId).then((result) => {
        if (!isApiError(result)) {
          const prevRank = g.rank;
          g.leaderboard = (result.leaders || []).map((l) => ({
            rank: l.rank,
            name: l.playerName,
            score: l.score,
            movement: 0,
            isYou: l.playerName === g.nickname,
          }));
          g.playerCount = result.totalPlayers;
          if (result.you) {
            g.rank = result.you.rank;
            g.rankChange = prevRank > 0 ? prevRank - result.you.rank : 0;
          }
        }
      });
    }

    // Calculate eliminated indices from hints
    let eliminatedIndices: number[] = [];
    if (g.questionData && g.rawQuestionData && clockState.hintsVisible) {
      eliminatedIndices = clockState.hintsVisible.map(
        (h) => g.rawQuestionData!.eliminateOrder[h]
      ).filter((idx) => idx !== undefined);
      // Update the questionData's eliminatedIndices
      g.questionData = { ...g.questionData, eliminatedIndices };
    }

    // Calculate points
    const points = clockState.canAnswer
      ? calculatePoints(clockState.elapsedInQuestion || 0)
      : 0;

    // Calculate countdown value for category_splash
    const countdownValue = clockState.questionPhase === 'category_splash'
      ? Math.max(1, Math.ceil((5000 - (clockState.elapsedInQuestion || 0)) / 1000))
      : 0;

    // Build the answer result with correctIndex from raw data during reveal
    let answerResult = g.answerResult;
    if (answerResult && clockState.correctRevealed && g.rawQuestionData?.correctIndex !== undefined) {
      answerResult = { ...answerResult, correctIndex: g.rawQuestionData.correctIndex };
    }

    setGameState({
      gamePhase: mobilePhase,
      gameId: g.gameId,
      questionNumber: clockState.questionNumber || 0,
      totalQuestions: TOTAL_QUESTIONS,
      timeRemaining: clockState.questionSecondsRemaining || 0,
      pointsAvailable: points,
      totalScore: g.totalScore,
      rank: g.rank,
      rankChange: g.rankChange,
      question: g.questionData,
      answerResult,
      leaderboard: g.leaderboard,
      playerStats: { ...g.playerStats },
      barName: g.barName,
      barCode: g.barCode,
      countdownValue,
      playerCount: g.playerCount,
    });
  }, []);

  const startGame = useCallback((
    gameId: string,
    startTimeEpoch: number,
    barCode: string,
    barName: string,
    deviceId: string,
    nickname: string,
  ) => {
    const g = gameRef.current;
    g.gameId = gameId;
    g.startTimeEpoch = startTimeEpoch;
    g.barCode = barCode;
    g.barName = barName;
    g.deviceId = deviceId;
    g.nickname = nickname;
    g.currentQuestionNumber = 0;
    g.questionData = null;
    g.rawQuestionData = null;
    g.answerResult = null;
    g.totalScore = 0;
    g.fetchingQuestion = false;
    g.submitting = false;
    g.leaderboardFetched = false;
    g.leaderboard = [];
    g.playerStats = { ...INITIAL_STATS };
    g.rank = 0;
    g.rankChange = 0;
    g.playerCount = 0;
    g.lastPhase = '';

    // Start the tick loop
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, 250);
    tick(); // immediate first tick
  }, [tick]);

  const doSubmitAnswer = useCallback((answerIndex: number) => {
    const g = gameRef.current;
    if (!g.gameId || !g.questionData || g.submitting) return;
    // Allow changing answer — skip if tapping the same one
    if (g.answerResult && g.answerResult.selectedIndex === answerIndex) return;
    g.submitting = true;

    const clockState = clockGetGameState(g.startTimeEpoch, Date.now());
    const clientPoints = calculatePoints(clockState.elapsedInQuestion || 0);

    // Revert stats from previous answer if changing
    if (g.answerResult && g.answerResult.correct !== undefined) {
      if (g.answerResult.pointsAwarded > 0) {
        g.playerStats.correct = Math.max(0, g.playerStats.correct - 1);
      } else if (g.answerResult.selectedIndex >= 0) {
        g.playerStats.wrong = Math.max(0, g.playerStats.wrong - 1);
      }
    }

    // Immediate local feedback
    g.answerResult = {
      selectedIndex: answerIndex,
      correct: false,
      pointsAwarded: 0,
      lockedInPoints: clientPoints,
      correctAnswer: '',
      correctIndex: -1,
    };

    submitAnswer(
      g.gameId!,
      g.currentQuestionNumber,
      g.questionData.answers[answerIndex],
      g.nickname,
      clockState.elapsedInQuestion || 0,
      g.deviceId,
    ).then((result) => {
      g.submitting = false;
      if (!isApiError(result)) {
        // Compute correctIndex from correctAnswer text (backend doesn't send index to prevent cheating)
        let correctIdx = g.rawQuestionData?.correctIndex ?? -1;
        if (correctIdx === -1 && result.correctAnswer && g.questionData) {
          correctIdx = g.questionData.answers.indexOf(result.correctAnswer);
        }
        g.answerResult = {
          selectedIndex: answerIndex,
          correct: result.correct,
          pointsAwarded: result.pointsAwarded,
          lockedInPoints: clientPoints,
          correctAnswer: result.correctAnswer,
          correctIndex: correctIdx,
        };
        g.totalScore = result.totalGameScore;

        // Update stats
        if (result.correct) {
          g.playerStats.correct += 1;
          g.playerStats.streak += 1;
          if (g.playerStats.streak > g.playerStats.bestStreak) {
            g.playerStats.bestStreak = g.playerStats.streak;
          }
        } else {
          g.playerStats.wrong += 1;
          g.playerStats.streak = 0;
        }
      }
    });
  }, []);

  const resetGame = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const g = gameRef.current;
    g.gameId = null;
    g.startTimeEpoch = 0;
    g.currentQuestionNumber = 0;
    g.questionData = null;
    g.rawQuestionData = null;
    g.answerResult = null;
    g.totalScore = 0;
    g.leaderboard = [];
    g.playerStats = { ...INITIAL_STATS };
    setGameState(INITIAL_STATE);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return (
    <GameContext.Provider value={{ gameState, startGame, doSubmitAnswer, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
