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
import { getQuestion, submitAnswer, getLeaderboard, isApiError, getServerNow } from '../services/api';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const KEEP_AWAKE_TAG = 'GAME_ACTIVE';

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
    deferredTotalScore: null as number | null,
    fetchingQuestion: false,
    submitting: false,
    leaderboardFetched: false,
    leaderboard: [] as LeaderboardEntry[],
    playerStats: { ...INITIAL_STATS },
    rank: 0,
    rankChange: 0,
    playerCount: 0,
    lastPhase: '' as string,
    pendingResult: null as { correct: boolean; pointsAwarded: number; correctAnswer: string; totalGameScore: number } | null,
    statsSnapshot: { ...INITIAL_STATS } as PlayerStats, // cached immutable copy for React state
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const tick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameId || !g.startTimeEpoch) return;

    const clockState = clockGetGameState(g.startTimeEpoch, getServerNow());
    const mobilePhase = mapPhase(clockState.gamePhase, clockState.questionPhase);

    // New question detected
    if (clockState.gamePhase === 'active' && clockState.questionNumber !== g.currentQuestionNumber) {
      // Track timeout for previous question
      if (g.currentQuestionNumber > 0 && !g.answerResult) {
        g.playerStats.timeout += 1;
        g.playerStats.streak = 0;
      }

      // Apply any pending score before moving to next question
      if (g.deferredTotalScore !== null) {
        g.totalScore = g.deferredTotalScore;
        g.deferredTotalScore = null;
      }
      g.currentQuestionNumber = clockState.questionNumber!;
      g.questionData = null;
      g.rawQuestionData = null;
      g.answerResult = null;
      g.pendingResult = null;
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
      getQuestion(g.gameId!, clockState.questionNumber, g.deviceId, abortRef.current?.signal).then((result) => {
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
      getLeaderboard(g.gameId, isSolo ? 'global' : 'bar', isSolo ? undefined : g.barCode, g.deviceId, abortRef.current?.signal).then((result) => {
        if (!isApiError(result)) {
          const prevRank = g.rank;
          g.leaderboard = (result.leaders || []).map((l) => ({
            rank: l.rank,
            name: l.playerName,
            score: l.score,
            movement: 0,
            isYou: l.playerId === g.deviceId,
          }));
          g.playerCount = result.totalPlayers;
          if (result.you) {
            g.rank = result.you.rank;
            g.rankChange = prevRank > 0 ? prevRank - result.you.rank : 0;
          }
        }
      });
    }

    // Calculate eliminated indices from hints — only create new object when list changes
    if (g.questionData && g.rawQuestionData && clockState.hintsVisible) {
      const newEliminated = clockState.hintsVisible.map(
        (h) => g.rawQuestionData!.eliminateOrder[h]
      ).filter((idx) => idx !== undefined);
      if (newEliminated.length !== g.questionData.eliminatedIndices.length) {
        g.questionData = { ...g.questionData, eliminatedIndices: newEliminated };
      }
    }

    // Calculate points
    const points = clockState.canAnswer
      ? calculatePoints(clockState.elapsedInQuestion || 0)
      : 0;

    // Calculate countdown value for category_splash
    const countdownValue = clockState.questionPhase === 'category_splash'
      ? Math.max(1, Math.ceil((4000 - (clockState.elapsedInQuestion || 0)) / 1000))
      : 0;

    // Reveal phase: apply pending server result (correctness, score, stats)
    // This is when the player first learns if they got it right.
    let answerResult = g.answerResult;
    if (clockState.correctRevealed) {
      // Apply pending API result once at reveal time
      if (g.pendingResult && answerResult) {
        const pr = g.pendingResult;
        let correctIdx = g.rawQuestionData?.correctIndex ?? -1;
        if (correctIdx === -1 && pr.correctAnswer && g.questionData) {
          correctIdx = g.questionData.answers.indexOf(pr.correctAnswer);
        }
        answerResult = {
          selectedIndex: answerResult.selectedIndex,
          correct: pr.correct,
          pointsAwarded: pr.pointsAwarded,
          lockedInPoints: answerResult.lockedInPoints,
          correctAnswer: pr.correctAnswer,
          correctIndex: correctIdx,
        };
        g.answerResult = answerResult;
        // Defer totalScore update to scores phase so Correct/Wrong screens show old total
        g.deferredTotalScore = pr.totalGameScore;
        // Update stats now that we're revealing
        if (pr.correct) {
          g.playerStats.correct += 1;
          g.playerStats.streak += 1;
          if (g.playerStats.streak > g.playerStats.bestStreak) {
            g.playerStats.bestStreak = g.playerStats.streak;
          }
        } else {
          g.playerStats.wrong += 1;
          g.playerStats.streak = 0;
        }
        g.pendingResult = null; // Applied — don't repeat
      } else if (!answerResult && g.rawQuestionData?.correctIndex !== undefined) {
        // Player didn't answer — still show the correct answer at reveal
        answerResult = {
          selectedIndex: -1,
          correct: false,
          pointsAwarded: 0,
          lockedInPoints: 0,
          correctAnswer: g.questionData?.answers[g.rawQuestionData.correctIndex] || '',
          correctIndex: g.rawQuestionData.correctIndex,
        };
        g.answerResult = answerResult;
      } else if (answerResult && answerResult.correctIndex === undefined && g.rawQuestionData?.correctIndex !== undefined) {
        // Edge case: reveal phase but correctIndex not yet set (from get-question data)
        answerResult = { ...answerResult, correctIndex: g.rawQuestionData.correctIndex };
        g.answerResult = answerResult;
      }
    }

    // Apply deferred total score during scores phase (so Correct/Wrong show old total)
    if (clockState.questionPhase === 'scores' && g.deferredTotalScore !== null) {
      g.totalScore = g.deferredTotalScore;
      g.deferredTotalScore = null;
    }

    // Functional update: skip re-render if nothing meaningful changed
    setGameState(prev => {
      const qNum = clockState.questionNumber || 0;
      const timeRem = clockState.questionSecondsRemaining || 0;
      if (
        prev.gamePhase === mobilePhase &&
        prev.questionNumber === qNum &&
        prev.timeRemaining === timeRem &&
        prev.pointsAvailable === points &&
        prev.totalScore === g.totalScore &&
        prev.rank === g.rank &&
        prev.question === g.questionData &&
        prev.answerResult === answerResult &&
        prev.countdownValue === countdownValue &&
        prev.playerCount === g.playerCount &&
        prev.leaderboard === g.leaderboard
      ) {
        return prev; // Same reference → no re-render
      }
      // Only create new stats snapshot when stats actually changed
      const ps = g.playerStats;
      const ss = g.statsSnapshot;
      if (ps.correct !== ss.correct || ps.wrong !== ss.wrong ||
          ps.timeout !== ss.timeout || ps.streak !== ss.streak ||
          ps.bestStreak !== ss.bestStreak) {
        g.statsSnapshot = { ...ps };
      }
      return {
        gamePhase: mobilePhase,
        gameId: g.gameId,
        questionNumber: qNum,
        totalQuestions: TOTAL_QUESTIONS,
        timeRemaining: timeRem,
        pointsAvailable: points,
        totalScore: g.totalScore,
        rank: g.rank,
        rankChange: g.rankChange,
        question: g.questionData,
        answerResult,
        leaderboard: g.leaderboard,
        playerStats: g.statsSnapshot,
        barName: g.barName,
        barCode: g.barCode,
        countdownValue,
        playerCount: g.playerCount,
      };
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
    g.deferredTotalScore = null;
    g.fetchingQuestion = false;
    g.submitting = false;
    g.leaderboardFetched = false;
    g.leaderboard = [];
    g.playerStats = { ...INITIAL_STATS };
    g.rank = 0;
    g.rankChange = 0;
    g.playerCount = 0;
    g.lastPhase = '';

    // Cancel any pending requests from previous game
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    // Keep screen on during gameplay
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    // Start the tick loop (250ms for responsive phase detection, especially on Android)
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

    const clockState = clockGetGameState(g.startTimeEpoch, getServerNow());
    const clientPoints = calculatePoints(clockState.elapsedInQuestion || 0);

    // Clear any previous pending result when changing answer
    g.pendingResult = null;

    // Immediate local feedback
    g.answerResult = {
      selectedIndex: answerIndex,
      correct: false,
      pointsAwarded: 0,
      lockedInPoints: clientPoints,
      correctAnswer: '',
      correctIndex: -1,
    };

    const effectiveBarCode = g.barCode === 'SOLO' ? '' : g.barCode;
    submitAnswer(
      g.gameId!,
      g.currentQuestionNumber,
      g.questionData.answers[answerIndex],
      g.nickname,
      clockState.elapsedInQuestion || 0,
      g.deviceId,
      effectiveBarCode,
      abortRef.current?.signal,
    ).then((result) => {
      g.submitting = false;
      if (!isApiError(result)) {
        // Store the server result but DON'T reveal correctness or update score yet.
        // These are deferred until the reveal phase (see tick() where correctRevealed is checked).
        g.answerResult = {
          selectedIndex: answerIndex,
          correct: false,        // Hidden until reveal
          pointsAwarded: 0,      // Hidden until reveal
          lockedInPoints: clientPoints,
          correctAnswer: '',     // Hidden until reveal
          correctIndex: undefined as unknown as number, // Hidden until reveal
        };
        // Stash server result for reveal phase
        g.pendingResult = {
          correct: result.correct,
          pointsAwarded: result.pointsAwarded,
          correctAnswer: result.correctAnswer,
          totalGameScore: result.totalGameScore,
        };
      }
    });
  }, []);

  const resetGame = useCallback(() => {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const g = gameRef.current;
    g.gameId = null;
    g.startTimeEpoch = 0;
    g.currentQuestionNumber = 0;
    g.questionData = null;
    g.rawQuestionData = null;
    g.answerResult = null;
    g.pendingResult = null;
    g.totalScore = 0;
    g.deferredTotalScore = null;
    g.leaderboard = [];
    g.playerStats = { ...INITIAL_STATS };
    setGameState(INITIAL_STATE);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      if (tickRef.current) clearInterval(tickRef.current);
      if (abortRef.current) abortRef.current.abort();
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
