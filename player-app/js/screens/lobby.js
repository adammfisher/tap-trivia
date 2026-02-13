/**
 * Tap Trivia Player App — Lobby Screen
 * "You're In!" celebration after joining a bar.
 * Polls for game start, then transitions to game screen.
 */

const LobbyScreen = {
  pollInterval: null,

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

    // Start polling for game state
    this.startPolling();
  },

  hide() {
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.checkGameStatus(), 5000);
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
      const now = Date.now();
      const state = getGameState(game.startTimeEpoch, now);
      if (state.gamePhase === 'active') {
        this.stopPolling();
        App.startGame(game.gameId, game.startTimeEpoch);
        return;
      }
    }

    // Update player count if bar info is available
    if (game && game.activePlayers !== undefined) {
      document.getElementById('lobby-player-count').innerHTML =
        `👥 ${game.activePlayers} player${game.activePlayers !== 1 ? 's' : ''}`;
    }
  }
};
