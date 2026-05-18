import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTvState,
  getBetweenGameData,
  registerBar,
  activateTV,
  getServerNow,
  type TvStateResponse,
  type SignageSlide,
} from '../services/api';
import {
  POLL_INTERVAL_ACTIVE,
  POLL_INTERVAL_IDLE,
  MAX_ERRORS_BEFORE_OVERLAY,
  ROTATION_DURATIONS,
  BETWEEN_TOTAL_DURATION,
} from '../config';
import { getNextGameTime, GAME_DURATION_MS, RESULTS_DURATION_MS } from '../utils/game-clock';
import type { TVState, TVScreen, BetweenGameData, INITIAL_TV_STATE } from '../types/tv-state';

const STORAGE_KEY = '@taptrivia_tv_config';

// ─── Signage helpers ──────────────────────────────────────────────────

function getDayName(): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ];
}

/**
 * Flatten a raw API signage slide (which has nested `data` + `schedule`)
 * into the flat SignageSlide shape that renderers expect.
 *
 * The web TV app does `renderer(slide.data || {})`, but our tvOS renderers
 * read `slide.headline`, `slide.items`, etc. directly — so we flatten here.
 */
function flattenSlide(raw: any): SignageSlide {
  const data = raw.data || {};
  const schedule = raw.schedule || {};

  // Base fields that map directly
  const slide: Record<string, any> = {
    template: raw.template,
    enabled: raw.enabled !== false,
    days: schedule.days,
    // Common data fields (spread directly)
    emoji: data.emoji,
    headline: data.headline,
    message: data.message,
    subtext: data.subtext,
    tagline: data.tagline,
    body: data.body,
    when: data.when,
    matchup: data.matchup,
    promo: data.promo,
    title: data.title,
  };

  // Template-specific field name mappings (API → tvOS renderer names)
  switch (raw.template) {
    case 'specials':
      slide.customLabel = data.label;
      slide.subheadline = data.subheadline;
      slide.items = (data.menuItems || []).map((m: any) => ({
        icon: m.icon, name: m.name, price: m.price, desc: m.desc,
      }));
      if (data.featuredName) {
        slide.featured = { name: data.featuredName, price: data.featuredPrice, icon: data.featuredIcon, desc: data.featuredDesc };
      }
      break;
    case 'happyhour':
      slide.when = data.timeRange || data.when;
      slide.tagline = data.frequency || data.tagline;
      slide.deals = (data.deals || []).map((d: any) => ({
        value: d.deal || d.value, name: d.item || d.name, color: d.color,
        // Keep originals as fallbacks
        deal: d.deal, item: d.item, price: d.price,
      }));
      break;
    case 'event':
      slide.headline = data.eventName || data.headline;
      slide.message = data.details || data.message;
      slide.when = data.when;
      slide.prize = (data.prizes || []).map((p: any) => ({
        emoji: p.emoji, place: p.place, label: p.prize || p.label,
      }));
      break;
    case 'brand':
      slide.hours = (data.hours || []).map((h: any) => ({
        day: h.day, label: h.label, hours: h.hours, name: h.name,
      }));
      break;
    case 'custom':
      slide.items = (data.items || []).map((item: any) => ({
        emoji: item.emoji, name: item.text || item.name, label: item.label,
      }));
      break;
    case 'sports':
      // All fields already mapped via common fields above
      break;
    case 'announcement':
      // All fields already mapped via common fields above
      break;
  }

  return slide as SignageSlide;
}

function getActiveSlides(slides: SignageSlide[]): SignageSlide[] {
  const today = getDayName();
  return slides.filter(s => {
    if (!s.enabled) return false;
    if (s.days && s.days.length > 0 && !s.days.includes(today)) return false;
    return true;
  });
}

// ─── State translation ────────────────────────────────────────────────

function translateApiState(
  api: TvStateResponse,
  prevScreen: TVScreen,
  signageIdx: number,
  activeSlides: SignageSlide[],
): TVScreen {
  if (api.state === 'active_game') {
    const phase = api.phase || '';
    if (phase === 'category_splash') return 'category';
    if (phase === 'get_ready' || phase === 'countdown') return 'getready';
    if (phase === 'reveal') return 'reveal';
    if (phase === 'scores') return 'between';
    if (['read_time', 'all_answers', 'hint_1', 'hint_2'].includes(phase)) return 'playing';
    // Fallback during active_game
    return 'playing';
  }

  if (api.state === 'game_over') {
    // Post-game rotation: results → idle → lobby
    return 'results';
  }

  // break state
  if (api.state === 'break') {
    return 'idle';
  }

  return prevScreen;
}

// ─── Next game countdown helper ──────────────────────────────────────

function computeCountdown(nextEpoch?: number): number {
  const SLOT_MS = 15 * 60 * 1000;
  const now = getServerNow();
  // Prefer API-provided epoch if it's in the future; otherwise fall back to
  // getNextGameTime (respects 5PM-2AM ET window). Then advance by 15-min slots
  // until we have a genuinely future time (matches web TV getNextFutureGameTime).
  let next = nextEpoch && nextEpoch > now ? nextEpoch : getNextGameTime(now);
  while (next <= now) next += SLOT_MS;
  return Math.max(0, Math.ceil((next - now) / 1000));
}

// ─── Context ──────────────────────────────────────────────────────────

interface TVStateContextValue {
  state: TVState;
  register: (name: string, email?: string) => Promise<string>;
  activate: (code: string) => Promise<void>;
  reset: () => void;
  goToSetup: () => void;
}

const TVStateContext = createContext<TVStateContextValue | null>(null);

export function useTVState(): TVStateContextValue {
  const ctx = useContext(TVStateContext);
  if (!ctx) throw new Error('useTVState must be used within TVStateProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────

export function TVStateProvider({ children }: { children: React.ReactNode }) {
  const [tvState, setTvState] = useState<TVState>({
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
  });

  // Mutable refs for poll loop
  const barCodeRef = useRef('');
  const barNameRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveErrorsRef = useRef(0);

  // Rotation state
  const rotationActiveRef = useRef(false);
  const rotationScreensRef = useRef<TVScreen[]>([]);
  const rotationIdxRef = useRef(0);
  const cachedScreenDataRef = useRef<Record<string, Partial<TVState>>>({});
  const latestApiRef = useRef<TvStateResponse | null>(null);

  // Signage state refs
  const signageSlidesRef = useRef<SignageSlide[]>([]);
  const signageIdxRef = useRef(0);
  const signageSlidesJsonRef = useRef<string>('[]');
  const stableSignageSlidesRef = useRef<SignageSlide[]>([]);

  // Stable refs for frequently-updated API arrays — prevent spurious re-renders
  const barLbJsonRef = useRef<string>('[]');
  const stableBarLbRef = useRef<any[]>([]);
  const globalLbJsonRef = useRef<string>('[]');
  const stableGlobalLbRef = useRef<any[]>([]);
  const answersJsonRef = useRef<string>('[]');
  const stableAnswersRef = useRef<string[]>([]);
  const eliminatedJsonRef = useRef<string>('[]');
  const stableEliminatedRef = useRef<any[]>([]);
  const answerPctJsonRef = useRef<string>('null');
  const stableAnswerPctRef = useRef<number[] | undefined>(undefined);

  // Between-game state refs
  const betweenGameActiveRef = useRef(false);
  const betweenGameDataRef = useRef<BetweenGameData | null>(null);
  const betweenGamePhasesRef = useRef<TVScreen[]>([]);
  const betweenGamePhaseIdxRef = useRef(0);
  const betweenGameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const betweenGameLastGameIdRef = useRef('');

  // ─── Load saved config ──────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const cfg = JSON.parse(stored);
          if (cfg.barCode) {
            barCodeRef.current = cfg.barCode;
            barNameRef.current = cfg.barName || '';
            setTvState(prev => ({
              ...prev,
              barCode: cfg.barCode,
              barName: cfg.barName || '',
            }));
            startPolling();
            return;
          }
        }
      } catch {}
      // Vega OS: auto-activate with default bar code if no saved config
      // (touch/remote input on setup screen is unreliable via ADB)
      const DEFAULT_BAR_CODE = 'DEMO1';
      console.log('[VEGA] No saved config, auto-activating with', DEFAULT_BAR_CODE);
      barCodeRef.current = DEFAULT_BAR_CODE;
      setTvState(prev => ({ ...prev, barCode: DEFAULT_BAR_CODE, screen: 'idle' }));
      startPolling();
    })();
    return () => stopAll();
  }, []);

  // ─── Save config ────────────────────────────────────────────────────

  async function saveConfig(code: string, name: string) {
    barCodeRef.current = code;
    barNameRef.current = name;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ barCode: code, barName: name }));
  }

  // ─── Polling ────────────────────────────────────────────────────────

  function stopAll() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (signageTimerRef.current) clearInterval(signageTimerRef.current);
    if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    if (betweenGameTimerRef.current) clearTimeout(betweenGameTimerRef.current);
    pollTimerRef.current = null;
    signageTimerRef.current = null;
    rotationTimerRef.current = null;
    betweenGameTimerRef.current = null;
  }

  function startPolling() {
    poll(); // immediate first poll
  }

  async function poll() {
    if (!barCodeRef.current) return;

    try {
      const api = await getTvState(barCodeRef.current);
      (api as any)._fetchedAt = Date.now();
      latestApiRef.current = api;
      consecutiveErrorsRef.current = 0;

      // Update signage — flatten nested API data into flat shape for renderers
      const rawSlides = (api.signage?.slides || []).map(flattenSlide);
      const active = getActiveSlides(rawSlides);
      // Stabilize array reference: only replace if content actually changed
      const activeJson = JSON.stringify(active);
      if (activeJson !== signageSlidesJsonRef.current) {
        signageSlidesJsonRef.current = activeJson;
        stableSignageSlidesRef.current = active;
      }
      signageSlidesRef.current = stableSignageSlidesRef.current;

      // Stabilize other frequently-updated arrays so reference equality detects actual changes
      const barLb = api.barLeaderboard || (api as any).lastGameBarLeaderboard || [];
      const barLbJson = JSON.stringify(barLb);
      if (barLbJson !== barLbJsonRef.current) {
        barLbJsonRef.current = barLbJson;
        stableBarLbRef.current = barLb;
      }
      const globalLb = api.globalLeaderboard || (api as any).lastGameGlobalLeaderboard || [];
      const globalLbJson = JSON.stringify(globalLb);
      if (globalLbJson !== globalLbJsonRef.current) {
        globalLbJsonRef.current = globalLbJson;
        stableGlobalLbRef.current = globalLb;
      }
      const answers = api.answers ?? [];
      const answersJson = JSON.stringify(answers);
      if (answersJson !== answersJsonRef.current) {
        answersJsonRef.current = answersJson;
        stableAnswersRef.current = answers;
      }
      const eliminated = api.eliminated ?? [];
      const eliminatedJson = JSON.stringify(eliminated);
      if (eliminatedJson !== eliminatedJsonRef.current) {
        eliminatedJsonRef.current = eliminatedJson;
        stableEliminatedRef.current = eliminated;
      }
      const answerPct = api.answerPercentages;
      const answerPctJson = JSON.stringify(answerPct ?? null);
      if (answerPctJson !== answerPctJsonRef.current) {
        answerPctJsonRef.current = answerPctJson;
        stableAnswerPctRef.current = answerPct;
      }

      const rotationSpeed = api.signage?.rotationSpeed || 60;

      // Start/update signage rotation
      if (active.length > 1) {
        if (!signageTimerRef.current) {
          signageTimerRef.current = setInterval(() => {
            signageIdxRef.current = (signageIdxRef.current + 1) % signageSlidesRef.current.length;
            setTvState(prev => ({
              ...prev,
              signageCurrentIndex: signageIdxRef.current,
            }));
          }, rotationSpeed * 1000);
        }
      } else {
        if (signageTimerRef.current) {
          clearInterval(signageTimerRef.current);
          signageTimerRef.current = null;
        }
        signageIdxRef.current = 0;
      }

      // Determine screen
      const screen = translateApiState(api, tvState.screen, signageIdxRef.current, active);

      // Derive correctIndex from correctAnswer if not provided
      let correctIndex = api.correctIndex;
      if (correctIndex == null && api.correctAnswer && api.answers) {
        correctIndex = api.answers.indexOf(api.correctAnswer);
        if (correctIndex === -1) correctIndex = undefined;
      }

      // Timer: set from API, local tick will decrement
      const timerSeconds = api.elapsedSeconds != null
        ? Math.max(0, Math.round(39 - api.elapsedSeconds))
        : undefined;

      // Build state
      const newState: TVState = {
        screen,
        barCode: api.barCode,
        barName: api.barName,
        gameId: api.gameId,
        activePlayers: api.activePlayers || (api.barLeaderboard || []).length || 0,
        questionNumber: api.questionNumber,
        totalQuestions: api.totalQuestions || 15,
        question: api.question,
        category: api.category,
        subcategory: api.subcategory || '',
        difficulty: api.difficulty,
        answers: stableAnswersRef.current,
        correctIndex,
        eliminated: stableEliminatedRef.current,
        answerPercentages: stableAnswerPctRef.current,
        pctCorrect: api.pctCorrect,
        funFact: api.funFact || '',
        gameStartEpoch: api.gameStartEpoch,
        elapsedSeconds: api.elapsedSeconds,
        currentPointsAvailable: api.currentPointsAvailable,
        timerSeconds,
        barLeaderboard: stableBarLbRef.current,
        globalLeaderboard: stableGlobalLbRef.current,
        nextGameStartEpoch: api.nextGameStartEpoch,
        secondsUntilNextGame: computeCountdown(api.nextGameStartEpoch),
        signageSlides: stableSignageSlidesRef.current,
        signageRotationSpeed: rotationSpeed,
        signageCurrentIndex: signageIdxRef.current,
        logoUrl: api.logoUrl,
        logoHash: api.logoHash,
        consecutiveErrors: 0,
        isConnected: true,
      };

      // Handle rotation for game_over / break
      if (api.state === 'game_over') {
        // Fetch between-game data once per game
        if (api.gameId && api.gameId !== betweenGameLastGameIdRef.current) {
          betweenGameLastGameIdRef.current = api.gameId;
          fetchBetweenGameData(api.gameId, newState);
        } else if (betweenGameActiveRef.current) {
          // Already in between-game — update state but keep current between screen
          setTvState(prev => ({
            ...newState,
            screen: prev.screen,
            betweenData: prev.betweenData,
          }));
        } else {
          handlePostGameRotation(api, newState);
        }
      } else if (api.state === 'break') {
        if (betweenGameActiveRef.current) {
          exitBetweenGameMode();
        }
        handlePostGameRotation(api, newState);
      } else {
        // Active game — stop rotation and between-game
        if (betweenGameActiveRef.current) {
          exitBetweenGameMode();
        }
        if (rotationActiveRef.current) {
          exitRotation();
        }
        // Skip re-render if only ephemeral fields (elapsedSeconds, timerSeconds) changed.
        // All array fields are stabilized above so reference equality is meaningful.
        setTvState(prev => {
          if (
            prev.screen === newState.screen &&
            prev.questionNumber === newState.questionNumber &&
            prev.activePlayers === newState.activePlayers &&
            prev.barLeaderboard === newState.barLeaderboard &&
            prev.answers === newState.answers &&
            prev.eliminated === newState.eliminated &&
            prev.correctIndex === newState.correctIndex &&
            prev.pctCorrect === newState.pctCorrect &&
            prev.answerPercentages === newState.answerPercentages &&
            prev.gameStartEpoch === newState.gameStartEpoch &&
            prev.signageSlides === newState.signageSlides &&
            prev.barName === newState.barName
          ) {
            return prev; // nothing render-relevant changed — bail out
          }
          return newState;
        });
      }

      // Schedule next poll
      const interval = api.state === 'active_game' ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
      pollTimerRef.current = setTimeout(poll, interval);
    } catch (err) {
      consecutiveErrorsRef.current++;
      setTvState(prev => ({
        ...prev,
        consecutiveErrors: consecutiveErrorsRef.current,
        isConnected: consecutiveErrorsRef.current < MAX_ERRORS_BEFORE_OVERLAY,
      }));
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_IDLE);
    }
  }

  // ─── Post-game screen rotation ─────────────────────────────────────

  function handlePostGameRotation(api: TvStateResponse, newState: TVState) {
    // Cache data for rotation screens
    cachedScreenDataRef.current.results = { ...newState, screen: 'results' };
    cachedScreenDataRef.current.idle = { ...newState, screen: 'idle' };
    cachedScreenDataRef.current.lobby = { ...newState, screen: 'lobby' };

    // Build screen list — always recompute (conditions change over time)
    const secsToNext = computeCountdown(api.nextGameStartEpoch);
    const includeLobby = secsToNext > 0 && secsToNext <= 900;
    let newScreens: TVScreen[];
    if (api.state === 'game_over') {
      newScreens = includeLobby
        ? ['results', 'lobby', 'idle']
        : ['results', 'idle'];
    } else {
      // break state — include lobby during on-hours, idle only during off-hours
      if (includeLobby) {
        newScreens = ['lobby', 'idle'];
      } else {
        newScreens = ['idle'];
      }
    }

    if (!rotationActiveRef.current) {
      // Start rotation
      rotationActiveRef.current = true;
      rotationScreensRef.current = newScreens;
      rotationIdxRef.current = 0;
      const firstScreen = newScreens[0] as TVScreen;
      setTvState({ ...newState, screen: firstScreen });
      // Only schedule rotation if there are multiple screens to cycle through
      if (newScreens.length > 1) {
        scheduleNextRotation(firstScreen);
      }
    } else {
      // Already rotating — update screen list and cached data
      const prevScreenKey = rotationScreensRef.current.join(',');
      const newScreenKey = newScreens.join(',');
      const screenListChanged = prevScreenKey !== newScreenKey;
      const prevLength = rotationScreensRef.current.length;
      rotationScreensRef.current = newScreens;
      // Clamp index if list shrank (e.g. lobby removed)
      if (rotationIdxRef.current >= newScreens.length) {
        rotationIdxRef.current = 0;
      }
      // If list shrank to 1 screen, stop the rotation timer
      if (newScreens.length <= 1 && rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      } else if (newScreens.length > 1 && prevLength <= 1) {
        // List grew — start rotation timer
        scheduleNextRotation(newScreens[rotationIdxRef.current]);
      }
      // Only re-render if the screen list changed (e.g. lobby appeared/disappeared).
      // During stable off-hours idle the list is always ['idle'] — skip setTvState
      // to avoid a full re-render every poll cycle.
      if (screenListChanged) {
        const currentRotScreen = newScreens[rotationIdxRef.current] as TVScreen;
        const cached = cachedScreenDataRef.current[currentRotScreen];
        if (cached) {
          setTvState(prev => ({
            ...prev,
            ...cached,
            screen: currentRotScreen,
            signageSlides: prev.signageSlides,
            signageCurrentIndex: prev.signageCurrentIndex,
            signageRotationSpeed: prev.signageRotationSpeed,
            secondsUntilNextGame: computeCountdown(api.nextGameStartEpoch),
          }));
        }
      }
    }
  }

  function scheduleNextRotation(currentScreen: string) {
    if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    const duration = ROTATION_DURATIONS[currentScreen] || 60000;
    rotationTimerRef.current = setTimeout(() => {
      if (!rotationActiveRef.current) return;
      rotationIdxRef.current = (rotationIdxRef.current + 1) % rotationScreensRef.current.length;
      const nextScreen = rotationScreensRef.current[rotationIdxRef.current] as TVScreen;
      const cached = cachedScreenDataRef.current[nextScreen];
      if (cached) {
        setTvState(prev => ({
          ...prev,
          ...cached,
          screen: nextScreen,
          // Preserve live signage state
          signageSlides: prev.signageSlides,
          signageCurrentIndex: prev.signageCurrentIndex,
          signageRotationSpeed: prev.signageRotationSpeed,
          secondsUntilNextGame: computeCountdown(prev.nextGameStartEpoch),
        }));
      }
      scheduleNextRotation(nextScreen);
    }, duration);
  }

  function exitRotation() {
    rotationActiveRef.current = false;
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    cachedScreenDataRef.current = {};
  }

  // ─── Between-game experience ────────────────────────────────────

  async function fetchBetweenGameData(gameId: string, baseState: TVState) {
    try {
      const data = await getBetweenGameData(barCodeRef.current, gameId);
      betweenGameDataRef.current = data;

      // Build phase list from non-null phases
      const phases: TVScreen[] = [];
      if (data.podium) phases.push('between-podium');
      if (data.barStandings) phases.push('between-standings');
      if (data.national) phases.push('between-national');
      if (data.hype) phases.push('between-hype');

      if (phases.length === 0) {
        // No data — fall back to normal rotation
        handlePostGameRotation(latestApiRef.current!, baseState);
        return;
      }

      // Start between-game sequence
      betweenGameActiveRef.current = true;
      betweenGamePhasesRef.current = phases;
      betweenGamePhaseIdxRef.current = 0;

      const firstScreen = phases[0];
      setTvState({
        ...baseState,
        screen: firstScreen,
        betweenData: data,
      });

      // Schedule phase cycling
      scheduleBetweenGamePhase(phases);
    } catch {
      // API error — fall back to normal rotation
      handlePostGameRotation(latestApiRef.current!, baseState);
    }
  }

  function scheduleBetweenGamePhase(phases: TVScreen[]) {
    if (betweenGameTimerRef.current) clearTimeout(betweenGameTimerRef.current);
    // Distribute total duration evenly across phases
    const phaseDuration = Math.floor(BETWEEN_TOTAL_DURATION / phases.length);

    betweenGameTimerRef.current = setTimeout(() => {
      if (!betweenGameActiveRef.current) return;

      betweenGamePhaseIdxRef.current++;

      if (betweenGamePhaseIdxRef.current >= phases.length) {
        // All phases done — transition to normal rotation
        exitBetweenGameMode();
        if (latestApiRef.current) {
          const api = latestApiRef.current;
          // Build base state for rotation, clearing betweenData
          setTvState(prev => {
            const baseState: TVState = { ...prev, betweenData: null };
            // Kick off rotation on next tick to avoid nested setState
            setTimeout(() => handlePostGameRotation(api, baseState), 0);
            return baseState;
          });
        }
        return;
      }

      const nextScreen = phases[betweenGamePhaseIdxRef.current];
      setTvState(prev => ({
        ...prev,
        screen: nextScreen,
      }));

      scheduleBetweenGamePhase(phases);
    }, phaseDuration);
  }

  function exitBetweenGameMode() {
    betweenGameActiveRef.current = false;
    betweenGameDataRef.current = null;
    betweenGamePhasesRef.current = [];
    betweenGamePhaseIdxRef.current = 0;
    if (betweenGameTimerRef.current) {
      clearTimeout(betweenGameTimerRef.current);
      betweenGameTimerRef.current = null;
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────

  const doRegister = useCallback(async (name: string, email?: string): Promise<string> => {
    const result = await registerBar(name, email);
    return result.barCode;
  }, []);

  const doActivate = useCallback(async (code: string) => {
    const result = await activateTV(code);
    await saveConfig(code, result.barName || code);
    setTvState(prev => ({
      ...prev,
      barCode: code,
      barName: result.barName || code,
      screen: 'idle',
    }));
    startPolling();
  }, []);

  const doReset = useCallback(() => {
    stopAll();
    barCodeRef.current = '';
    barNameRef.current = '';
    AsyncStorage.removeItem(STORAGE_KEY);
    rotationActiveRef.current = false;
    cachedScreenDataRef.current = {};
    exitBetweenGameMode();
    betweenGameLastGameIdRef.current = '';
    setTvState({
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
    });
  }, []);

  // Go to setup keeping bar code so user can edit it
  const doGoToSetup = useCallback(() => {
    stopAll();
    rotationActiveRef.current = false;
    cachedScreenDataRef.current = {};
    exitBetweenGameMode();
    betweenGameLastGameIdRef.current = '';
    setTvState(prev => ({
      ...prev,
      screen: 'setup',
    }));
  }, []);

  return (
    <TVStateContext.Provider
      value={{
        state: tvState,
        register: doRegister,
        activate: doActivate,
        reset: doReset,
        goToSetup: doGoToSetup,
      }}
    >
      {children}
    </TVStateContext.Provider>
  );
}
