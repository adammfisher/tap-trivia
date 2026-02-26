/**
 * Tap Trivia Player App — Lobby Screen
 * "You're In!" celebration after joining a bar.
 * Polls for game start, then transitions to game screen.
 */

const LobbyScreen = {
  pollInterval: null,
  _countdownInterval: null,
  _nextGameEpoch: null,

  show() {
    const barCode = Player.getBarCode();
    const playerName = Player.getName();

    // Display bar code and name
    document.getElementById('lobby-bar-code').textContent = barCode;
    const barNameEl = document.getElementById('lobby-bar-name');
    if (barNameEl) barNameEl.textContent = Player.getBarName();

    // Player card
    const initial = playerName.charAt(0).toUpperCase();
    document.getElementById('lobby-player-card').innerHTML = `
      <div class="lobby-avatar">${initial}</div>
      <div class="lobby-player-info">
        <div class="lobby-player-name">${playerName}</div>
        <div class="lobby-player-status">
          <span class="lobby-status-dot"></span>
          Ready to play
        </div>
      </div>
    `;

    // Player count badge
    document.getElementById('lobby-player-count').innerHTML = `👥 Waiting...`;

    // Game status
    document.getElementById('lobby-game-status').textContent = 'Waiting for the next game to start...';
    document.getElementById('lobby-countdown').textContent = '';

    // Start polling for game state
    this.startPolling();
    this._startCountdownTick();
  },

  hide() {
    this.stopPolling();
    this._stopCountdownTick();
  },

  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.checkGameStatus(), 10000);
    this.checkGameStatus();
  },

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  async checkGameStatus() {
    const game = await apiCall('GET', '/game/current');

    if (game && !game.error && game.status === 'active' && game.startTimeEpoch) {
      const now = getServerNow();
      const state = getGameState(game.startTimeEpoch, now);
      if (state.gamePhase === 'active') {
        this.stopPolling();
        App.startGame(game.gameId, game.startTimeEpoch);
        return;
      }
      if (state.gamePhase === 'pre_game') {
        const statusEl = document.getElementById('lobby-game-status');
        if (statusEl) {
          statusEl.textContent = `Next game starts in ${state.secondsUntilStart}s...`;
        }
      }
    }

    // Store next game epoch for the 1-second countdown tick
    if (game && game.nextGameStartEpoch) {
      this._nextGameEpoch = game.nextGameStartEpoch;
    } else if (game && game.startTimeEpoch && game.status !== 'active') {
      // pre_game: the start time IS the next game
      this._nextGameEpoch = game.startTimeEpoch;
    }

    // Update player count if bar info is available
    if (game && game.activePlayers !== undefined) {
      document.getElementById('lobby-player-count').innerHTML =
        `👥 ${game.activePlayers} player${game.activePlayers !== 1 ? 's' : ''}`;
    }
  },

  _startCountdownTick() {
    this._stopCountdownTick();
    this._countdownInterval = setInterval(() => this._tickCountdown(), 1000);
  },

  _stopCountdownTick() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  },

  _tickCountdown() {
    const el = document.getElementById('lobby-countdown');
    if (!el || !this._nextGameEpoch) return;

    const secsLeft = Math.max(0, Math.ceil((this._nextGameEpoch - getServerNow()) / 1000));
    if (secsLeft > 0) {
      el.textContent = `Next game in ${secsLeft}s`;
    } else {
      el.textContent = 'Starting...';
    }
  }
};
