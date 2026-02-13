/**
 * Tap Trivia Player App — Player State Management
 * Manages UUID, display name, bar state in localStorage.
 */

const STORAGE_KEYS = {
  PLAYER_ID: 'tt_player_id',
  PLAYER_NAME: 'tt_player_name',
  BAR_CODE: 'tt_bar_code',
  BAR_NAME: 'tt_bar_name',
  MUTED: 'tt_muted'
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

  setBar(code, name) {
    localStorage.setItem(STORAGE_KEYS.BAR_CODE, code);
    localStorage.setItem(STORAGE_KEYS.BAR_NAME, name);
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
  }
};
