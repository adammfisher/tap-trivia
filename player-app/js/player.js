/**
 * Tap Trivia Player App — Player State Management
 * Manages UUID, display name, location state in localStorage.
 */

const STORAGE_KEYS = {
  PLAYER_ID: 'tt_player_id',
  PLAYER_NAME: 'tt_player_name',
  BAR_CODE: 'tt_bar_code',
  BAR_NAME: 'tt_bar_name',
  MUTED: 'tt_muted',
  ACTIVE_GAME_ID: 'tt_active_game_id',
  ACTIVE_GAME_START: 'tt_active_game_start',
  LAST_GAME_ID: 'tt_last_game_id',
  LAST_GAME_SCORE: 'tt_last_game_score',
  BAR_HISTORY: 'tt_bar_history'
};

const Player = {
  getId() {
    let id = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id);
    }
    return id;
  },

  getName() {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
  },

  setName(name) {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  },

  getBarCode() {
    return localStorage.getItem(STORAGE_KEYS.BAR_CODE) || '';
  },

  getBarName() {
    return localStorage.getItem(STORAGE_KEYS.BAR_NAME) || '';
  },

  setBar(code, name, type) {
    localStorage.setItem(STORAGE_KEYS.BAR_CODE, code);
    localStorage.setItem(STORAGE_KEYS.BAR_NAME, name);
    this.addBarToHistory(code, name, type);
  },

  clearBar() {
    localStorage.removeItem(STORAGE_KEYS.BAR_CODE);
    localStorage.removeItem(STORAGE_KEYS.BAR_NAME);
  },

  isNewPlayer() {
    return !localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
  },

  hasName() {
    return !!localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
  },

  hasBar() {
    return !!localStorage.getItem(STORAGE_KEYS.BAR_CODE);
  },

  setActiveGame(gameId, startEpoch) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, gameId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_START, String(startEpoch));
  },

  getActiveGame() {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    const start = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_START);
    if (id && start) return { gameId: id, startTimeEpoch: Number(start) };
    return null;
  },

  clearActiveGame() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_START);
  },

  getBarHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.BAR_HISTORY)) || [];
    } catch { return []; }
  },

  setLastGame(gameId, score) {
    localStorage.setItem(STORAGE_KEYS.LAST_GAME_ID, gameId);
    localStorage.setItem(STORAGE_KEYS.LAST_GAME_SCORE, String(score || 0));
  },

  getLastGame() {
    const id = localStorage.getItem(STORAGE_KEYS.LAST_GAME_ID);
    const score = localStorage.getItem(STORAGE_KEYS.LAST_GAME_SCORE);
    if (id) return { gameId: id, score: Number(score) || 0 };
    return null;
  },

  addBarToHistory(code, name, type) {
    let history = this.getBarHistory();
    // Remove existing entry for this code (will re-add at front)
    history = history.filter(b => b.code !== code);
    history.unshift({ code, name, type: type || 'bar', joinedAt: Date.now() });
    // Cap at 20 locations
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.BAR_HISTORY, JSON.stringify(history));
  }
};
