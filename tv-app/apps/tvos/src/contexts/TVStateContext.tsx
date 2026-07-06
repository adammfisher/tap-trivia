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
  tvHeartbeat,
  signageImpression,
  getServerNow,
  type TvStateResponse,
  type SignageSlide,
  type SignageImpressionBody,
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
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

function makeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Signage helpers ──────────────────────────────────────────────────

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

// Day-of-week + enabled filtering is done authoritatively by the backend
// (get-tv-state), so we just render what it sends. The defensive enabled check
// guards against stale data only.
function getActiveSlides(slides: SignageSlide[]): SignageSlide[] {
  return slides.filter(s => s.enabled !== false);
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

// ─── DEV PREVIEW ──────────────────────────────────────────────────────
// Set DEV_PREVIEW_SCREEN to a TVScreen to force it with sample data and skip
// all polling — for visual QA against the web + Roku apps. null = normal.
export const DEV_PREVIEW_SCREEN: TVScreen | null = null;

const SAMPLE_SIGNAGE: SignageSlide[] = [
  {
    template: 'specials', enabled: true, emoji: '🍺',
    customLabel: 'Two Buck Saloon', headline: 'Daily Specials', subheadline: 'All Day Everyday',
    featured: { name: 'PBR Draft - High Life - Busch Light', price: '$2' },
    items: [
      { icon: '🥃', name: 'Buck Shot - PBR & Jim Beam', price: '$6' },
      { icon: '🥃', name: 'Cowboy Shot - PBR & Hornitos', price: '$7' },
      { icon: '🥃', name: 'Cowboy Shot - Vodka & Red bull', price: '$7' },
      { icon: '🥃', name: 'Doe Shot - White Claw & Deep Eddies', price: '$8' },
    ],
  } as any,
  {
    template: 'announcement', enabled: true, emoji: '🍕',
    headline: 'Grab a Pizza!', message: 'We have pizza behind the bar - ask your bartender for a cheese or 3-meat.',
  } as any,
];

const SAMPLE_LEADERBOARD: any[] = [
  { playerName: 'Hollis', name: 'Hollis', score: 2690, rank: 1 },
  { playerName: 'Tina_M', name: 'Tina_M', score: 2237, rank: 2 },
  { playerName: 'QuizKid', name: 'QuizKid', score: 1980, rank: 3 },
  { playerName: 'Marcus', name: 'Marcus', score: 1540, rank: 4 },
  { playerName: 'Jen', name: 'Jen', score: 1320, rank: 5 },
];

const SAMPLE_TV_STATE: TVState = {
  screen: 'idle',
  barCode: 'B8PQP',
  barName: 'Two Buck Saloon',
  gameId: 'sample-game',
  activePlayers: 12,
  questionNumber: 7,
  totalQuestions: 15,
  question: 'Which planet is known as the Red Planet?',
  category: 'Science & Space',
  subcategory: 'The Planets',
  difficulty: 2,
  answers: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
  correctIndex: 1,
  eliminated: [],
  answerPercentages: [10, 70, 12, 8],
  pctCorrect: 70,
  funFact: 'Mars appears red because of iron oxide (rust) coating its surface.',
  gameStartEpoch: Date.now() - 7 * 52000,
  elapsedSeconds: 13,
  currentPointsAvailable: 650,
  timerSeconds: 18,
  barLeaderboard: SAMPLE_LEADERBOARD,
  globalLeaderboard: SAMPLE_LEADERBOARD,
  nextGameStartEpoch: Date.now() + 105000,
  secondsUntilNextGame: 105,
  signageSlides: SAMPLE_SIGNAGE,
  signageRotationSpeed: 8,
  signageCurrentIndex: 0,
  betweenData: {
    podium: { players: SAMPLE_LEADERBOARD.map(p => ({ name: p.name, score: p.score, rank: p.rank })), questionCount: 15, playerCount: 12 },
    barStandings: null,
    national: null,
    hype: { nextGameId: 'next', categories: ['Movie Quotes', 'Fashion Trends, Streetwear', 'Pizza Wars', 'AI, Robots, Self-Driving Cars', 'Trains, Ships, the Titanic', 'World Capitals & Countries'], startsAt: Date.now() + 105000 },
  },
  consecutiveErrors: 0,
  isConnected: true,
};

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
  const [tvState, setTvState] = useState<TVState>(
    DEV_PREVIEW_SCREEN
      ? { ...SAMPLE_TV_STATE, screen: DEV_PREVIEW_SCREEN }
      : {
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
        },
  );

  // Mutable refs for poll loop
  const barCodeRef = useRef('');
  const barNameRef = useRef('');
  const tvIdRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastLoggedSlideKeyRef = useRef('');
  const lastLoggedScreenRef = useRef<TVScreen | ''>('');

  // Rotation state
  const rotationActiveRef = useRef(false);
  const rotationScreensRef = useRef<TVScreen[]>([]);
  const rotationIdxRef = useRef(0);
  const cachedScreenDataRef = useRef<Record<string, Partial<TVState>>>({});
  const latestApiRef = useRef<TvStateResponse | null>(null);

  // Signage state refs
  const signageSlidesRef = useRef<SignageSlide[]>([]);
  const signageIdxRef = useRef(0);

  // Between-game state refs
  const betweenGameActiveRef = useRef(false);
  const betweenGameDataRef = useRef<BetweenGameData | null>(null);
  const betweenGamePhasesRef = useRef<TVScreen[]>([]);
  const betweenGamePhaseIdxRef = useRef(0);
  const betweenGameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const betweenGameLastGameIdRef = useRef('');
  const betweenGamesStartedAtRef = useRef(0);

  // ─── Load saved config ──────────────────────────────────────────────

  // DEV preview: re-apply the forced screen on mount + on every Fast Refresh
  // (so editing DEV_PREVIEW_SCREEN live-updates the previewed screen).
  useEffect(() => {
    if (DEV_PREVIEW_SCREEN) {
      setTvState({ ...SAMPLE_TV_STATE, screen: DEV_PREVIEW_SCREEN });
    }
  }, []);

  useEffect(() => {
    if (DEV_PREVIEW_SCREEN) return; // preview mode — skip config load + polling
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        let cfg: { barCode?: string; barName?: string; tvId?: string } = {};
        if (stored) {
          try { cfg = JSON.parse(stored); } catch {}
        }
        if (!cfg.tvId) {
          cfg.tvId = makeUUID();
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        }
        tvIdRef.current = cfg.tvId;

        if (cfg.barCode) {
          barCodeRef.current = cfg.barCode;
          barNameRef.current = cfg.barName || '';
          setTvState(prev => ({
            ...prev,
            barCode: cfg.barCode!,
            barName: cfg.barName || '',
          }));
          startPolling();
          startHeartbeat();
        }
      } catch {}
    })();
    return () => stopAll();
  }, []);

  // ─── Save config ────────────────────────────────────────────────────

  async function saveConfig(code: string, name: string) {
    barCodeRef.current = code;
    barNameRef.current = name;
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ barCode: code, barName: name, tvId: tvIdRef.current }),
    );
  }

  // ─── Heartbeat ──────────────────────────────────────────────────────
  // Runs every 5 min while paired. Silent on success; logs on failure.
  // Used by analytics to count active TVs.

  function startHeartbeat() {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    if (!tvIdRef.current) return;
    void sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = null;
  }

  async function sendHeartbeat() {
    if (!tvIdRef.current) return;
    try { await tvHeartbeat(tvIdRef.current); }
    catch (err) { console.warn('[TV heartbeat] failed', err); }
  }

  // ─── Signage impressions ────────────────────────────────────────────
  // Fire-and-forget POST per slide display. Dedupe key = screen + index.

  function contextForScreen(screen: TVScreen | ''): SignageImpressionBody['context'] | null {
    if (screen === 'idle') return 'off_hours_idle';
    if (screen === 'lobby') return 'game_lobby';
    if (screen === 'between' || screen === 'leaderboard') return 'between_rounds';
    if (screen === 'results') return 'results';
    return null;
  }

  function logSignageImpressionIfNew(screen: TVScreen | '') {
    const ctx = contextForScreen(screen);
    if (!ctx) return;
    if (!barCodeRef.current || !tvIdRef.current) return;

    const slides = signageSlidesRef.current;
    if (!slides || slides.length === 0) return;
    const idx = signageIdxRef.current % slides.length;
    const slide = slides[idx];
    const signageId = (slide as { template?: string; id?: string }).template || (slide as { id?: string }).id || 'unknown';

    const key = `${ctx}:${idx}:${signageId}`;
    if (key === lastLoggedSlideKeyRef.current) return;
    lastLoggedSlideKeyRef.current = key;

    const api = latestApiRef.current;
    const players = api?.activePlayers ?? 0;
    const gameId = api?.gameId ?? null;
    if (ctx !== 'off_hours_idle' && !gameId) return;

    const body: SignageImpressionBody = {
      bar_code: barCodeRef.current,
      tv_id: tvIdRef.current,
      signage_id: signageId,
      content_type: signageId === '_default_cta' ? 'system' : 'bar_promo',
      displayed_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      duration_ms: ((api as { signage?: { rotationSpeed?: number } } | null)?.signage?.rotationSpeed || 60) * 1000,
      context: ctx,
      concurrent_players: ctx === 'off_hours_idle' ? 0 : players,
      game_id: ctx === 'off_hours_idle' ? null : gameId,
      position_in_rotation: idx + 1,
      tv_platform: 'appletv',
    };

    void signageImpression(body).catch(err =>
      console.warn('[Signage] impression failed', err instanceof Error ? err.message : err)
    );
  }

  // ─── Polling ────────────────────────────────────────────────────────

  function stopAll() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (signageTimerRef.current) clearInterval(signageTimerRef.current);
    if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    if (betweenGameTimerRef.current) clearTimeout(betweenGameTimerRef.current);
    stopHeartbeat();
    pollTimerRef.current = null;
    countdownTimerRef.current = null;
    signageTimerRef.current = null;
    rotationTimerRef.current = null;
    betweenGameTimerRef.current = null;
  }

  function startPolling() {
    poll(); // immediate first poll
    startCountdownTick();
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
      signageSlidesRef.current = active;

      const rotationSpeed = api.signage?.rotationSpeed || 60;

      // Start/update signage rotation
      if (active.length > 1) {
        if (!signageTimerRef.current) {
          signageTimerRef.current = setInterval(() => {
            signageIdxRef.current = (signageIdxRef.current + 1) % signageSlidesRef.current.length;
            lastLoggedSlideKeyRef.current = ''; // index changed — re-log
            setTvState(prev => ({
              ...prev,
              signageCurrentIndex: signageIdxRef.current,
            }));
            logSignageImpressionIfNew(lastLoggedScreenRef.current);
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

      // Fire signage impression on screen transitions into a signage screen.
      if (screen !== lastLoggedScreenRef.current) {
        lastLoggedSlideKeyRef.current = '';
        lastLoggedScreenRef.current = screen;
        logSignageImpressionIfNew(screen);
      }

      // Derive correctIndex from correctAnswer if not provided
      let correctIndex = api.correctIndex;
      if (correctIndex == null && api.correctAnswer && api.answers) {
        correctIndex = api.answers.indexOf(api.correctAnswer);
        if (correctIndex === -1) correctIndex = undefined;
      }

      // Timer: answer window closes at 31s (REVEAL_START_MS / 1000)
      const timerSeconds = api.elapsedSeconds != null
        ? Math.max(0, Math.round(31 - api.elapsedSeconds))
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
        answers: api.answers,
        correctIndex,
        eliminated: api.eliminated,
        answerPercentages: api.answerPercentages,
        pctCorrect: api.pctCorrect,
        funFact: api.funFact || '',
        gameStartEpoch: api.gameStartEpoch,
        elapsedSeconds: api.elapsedSeconds,
        currentPointsAvailable: api.currentPointsAvailable,
        timerSeconds,
        barLeaderboard: api.barLeaderboard || api.lastGameBarLeaderboard || [],
        globalLeaderboard: api.globalLeaderboard || api.lastGameGlobalLeaderboard || [],
        nextGameStartEpoch: api.nextGameStartEpoch,
        secondsUntilNextGame: computeCountdown(api.nextGameStartEpoch),
        signageSlides: active,
        signageRotationSpeed: rotationSpeed,
        signageCurrentIndex: signageIdxRef.current,
        logoUrl: api.logoUrl,
        logoHash: api.logoHash,
        consecutiveErrors: 0,
        isConnected: true,
      };

      // Handle rotation for game_over / break
      if (api.state === 'game_over') {
        // Fetch hype/categories once per game (for the Coming Up slide)
        if (api.gameId && api.gameId !== betweenGameLastGameIdRef.current) {
          betweenGameLastGameIdRef.current = api.gameId;
          void fetchBetweenGameDataQuiet(api.gameId);
        }
        if (!betweenGameActiveRef.current) {
          startBetweenGames(newState);
        } else {
          // Already rotating — refresh data; the time-based driver owns the screen
          setTvState(prev => ({
            ...newState,
            screen: prev.screen,
            betweenData: betweenGameDataRef.current || prev.betweenData,
          }));
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
        setTvState(newState);
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
      const currentRotScreen = newScreens[rotationIdxRef.current] as TVScreen;
      const cached = cachedScreenDataRef.current[currentRotScreen];
      if (cached) {
        setTvState(prev => ({
          ...prev,
          ...cached,
          screen: currentRotScreen,
          // Preserve live signage state — don't clobber with stale cached values
          signageSlides: prev.signageSlides,
          signageCurrentIndex: prev.signageCurrentIndex,
          signageRotationSpeed: prev.signageRotationSpeed,
          secondsUntilNextGame: computeCountdown(api.nextGameStartEpoch),
        }));
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

  // ─── Between-games rotation (Roku 5-slide, time-based over 120s) ──────
  //   0–20s  round-complete
  //   20–40s signage (full-screen 'idle')
  //   40–80s play-taptrivia
  //   80–100s signage (full-screen 'idle')
  //   100s+  coming-up
  // Driven off the synced clock so a TV that joins mid-window lands on the
  // correct slide (matches Roku's betweenRoundsOffsetMs approach).

  function betweenGamesScreenFor(offsetMs: number): TVScreen {
    if (offsetMs < 20000) return 'round-complete';
    if (offsetMs < 40000) return 'idle';           // full-screen signage slot A
    if (offsetMs < 80000) return 'play-taptrivia';
    if (offsetMs < 100000) return 'idle';          // full-screen signage slot B
    return 'coming-up';
  }

  function betweenGamesOffsetMs(): number {
    const gse = latestApiRef.current?.gameStartEpoch;
    if (gse != null) {
      return Math.max(0, getServerNow() - (gse + GAME_DURATION_MS));
    }
    if (betweenGamesStartedAtRef.current) {
      return Math.max(0, getServerNow() - betweenGamesStartedAtRef.current);
    }
    return 0;
  }

  function applyBetweenGamesSlide() {
    const screen = betweenGamesScreenFor(betweenGamesOffsetMs());
    setTvState(prev =>
      prev.screen === screen
        ? prev
        : { ...prev, screen, betweenData: betweenGameDataRef.current || prev.betweenData },
    );
  }

  function startBetweenGames(baseState: TVState) {
    betweenGameActiveRef.current = true;
    if (!betweenGamesStartedAtRef.current) betweenGamesStartedAtRef.current = getServerNow();
    const screen = betweenGamesScreenFor(betweenGamesOffsetMs());
    setTvState({
      ...baseState,
      screen,
      betweenData: betweenGameDataRef.current || baseState.betweenData,
    });
    if (betweenGameTimerRef.current) clearInterval(betweenGameTimerRef.current as unknown as ReturnType<typeof setInterval>);
    betweenGameTimerRef.current = setInterval(
      applyBetweenGamesSlide,
      500,
    ) as unknown as ReturnType<typeof setTimeout>;
  }

  async function fetchBetweenGameDataQuiet(gameId: string) {
    try {
      const data = await getBetweenGameData(barCodeRef.current, gameId);
      betweenGameDataRef.current = data;
      setTvState(prev => ({ ...prev, betweenData: data }));
    } catch {
      /* non-fatal — Coming Up shows a fallback */
    }
  }

  function exitBetweenGameMode() {
    betweenGameActiveRef.current = false;
    betweenGameDataRef.current = null;
    betweenGamesStartedAtRef.current = 0;
    if (betweenGameTimerRef.current) {
      clearInterval(betweenGameTimerRef.current as unknown as ReturnType<typeof setInterval>);
      betweenGameTimerRef.current = null;
    }
  }

  // ─── Countdown tick (1s) — next-game countdown only ──────────────
  // Game timer + points are now driven by a fast local clock in
  // PlayingScreen (using gameStartEpoch + getGameState at 50ms),
  // so we no longer decrement timerSeconds here.

  function startCountdownTick() {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setTvState(prev => {
        return {
          ...prev,
          secondsUntilNextGame: computeCountdown(prev.nextGameStartEpoch),
        };
      });
    }, 1000);
  }

  // ─── Actions ────────────────────────────────────────────────────────

  const doRegister = useCallback(async (name: string, email?: string): Promise<string> => {
    const result = await registerBar(name, email);
    return result.barCode;
  }, []);

  const doActivate = useCallback(async (code: string) => {
    if (!tvIdRef.current) tvIdRef.current = makeUUID();
    const result = await activateTV(code, tvIdRef.current);
    if (result.tvId) tvIdRef.current = result.tvId;
    await saveConfig(code, result.barName || code);
    setTvState(prev => ({
      ...prev,
      barCode: code,
      barName: result.barName || code,
      screen: 'idle',
    }));
    startPolling();
    startHeartbeat();
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
