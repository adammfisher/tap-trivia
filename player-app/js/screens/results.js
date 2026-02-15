/**
 * Tap Trivia Player App — Results Screen
 * Post-game: final score, bar rank, global rank, leaderboards.
 */

const ResultsScreen = {
  gameId: null,
  finalScore: 0,
  _autoNavTimer: null,

  async show(gameId, totalScore) {
    this.gameId = gameId;
    this.finalScore = totalScore;
    this.clearAutoNav();

    const barName = Player.getBarName();
    const container = document.getElementById('results-content');
    container.innerHTML = `
      <div class="results-top-bar">
        <div class="logo-small"><span class="logo__tap">Tap</span><span class="logo__trivia">Trivia</span></div>
        ${barName ? `<div class="p-bar-name">${barName}</div>` : ''}
      </div>
      <div class="results-header">
        <div class="results-gameover">GAME OVER</div>
        <div class="results-score">${(totalScore || 0).toLocaleString()}</div>
        <div class="results-points-label">POINTS</div>
      </div>
      <div class="results-loading">Loading leaderboards...</div>
    `;

    try {
      await this.loadLeaderboards();
    } catch (err) {
      console.error('Failed to load leaderboards:', err);
    }
  },

  clearAutoNav() {
    if (this._autoNavTimer) {
      clearTimeout(this._autoNavTimer);
      this._autoNavTimer = null;
    }
  },

  async loadLeaderboards() {
    const container = document.getElementById('results-content');
    let barLeaderHtml = '';
    let globalLeaderHtml = '';

    // Bar leaderboard
    if (Player.hasBar()) {
      const barData = await apiCall('GET',
        `/game/${this.gameId}/leaderboard?type=bar&barCode=${Player.getBarCode()}`);

      if (barData && !barData.error) {
        const you = barData.you;
        barLeaderHtml = `
          <div class="results-rank">
            #${you ? you.rank : '?'} of ${barData.totalPlayers} at ${Player.getBarName()}
          </div>
          <div class="results-leaders">
            ${(barData.leaders || []).slice(0, 10).map((p, i) => `
              <div class="leader-row ${p.playerName === Player.getName() ? 'leader-you' : ''}">
                <span class="leader-rank">${p.rank}.</span>
                <span class="leader-name">${p.playerName}</span>
                <span class="leader-score">${(p.score || 0).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Global leaderboard (may not be ready immediately)
    const globalData = await apiCall('GET',
      `/game/${this.gameId}/leaderboard?type=global`);

    if (globalData && !globalData.error) {
      const you = globalData.you;
      globalLeaderHtml = `
        <div class="results-global-rank">
          #${you ? you.rank : '?'} of ${globalData.totalPlayers} globally
        </div>
        <div class="results-leaders">
          ${(globalData.leaders || []).slice(0, 20).map((p, i) => `
            <div class="leader-row ${p.playerName === Player.getName() ? 'leader-you' : ''}">
              <span class="leader-rank">${p.rank}.</span>
              <span class="leader-name">${p.playerName}${p.barName ? ` (${p.barName})` : ''}</span>
              <span class="leader-score">${(p.score || 0).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      globalLeaderHtml = '<div class="results-pending">Global leaderboard loading...</div>';
    }

    const _barName = Player.getBarName();
    container.innerHTML = `
      <div class="results-top-bar">
        <div class="logo-small"><span class="logo__tap">Tap</span><span class="logo__trivia">Trivia</span></div>
        ${_barName ? `<div class="p-bar-name">${_barName}</div>` : ''}
      </div>
      <div class="results-header">
        <div class="results-gameover">GAME OVER</div>
        <div class="results-score">${this.finalScore.toLocaleString()}</div>
        <div class="results-points-label">POINTS</div>
      </div>
      ${barLeaderHtml ? `<div class="results-bar-section"><h3>${_barName} Leaderboard</h3>${barLeaderHtml}</div>` : ''}
      <div class="results-tabs">
        <button class="tab-btn active" onclick="ResultsScreen.showTab('bar')">YOUR BAR</button>
        <button class="tab-btn" onclick="ResultsScreen.showTab('global')">GLOBAL</button>
      </div>
      <div id="tab-bar" class="tab-content active">
        ${barLeaderHtml || '<div class="results-pending">Not at a bar</div>'}
      </div>
      <div id="tab-global" class="tab-content">
        ${globalLeaderHtml}
      </div>
      <button class="btn-next-game" onclick="App.showScreen('home')">
        Next Game →
      </button>
    `;
  },

  hide() {
    this.clearAutoNav();
  },

  showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    event.target.classList.add('active');
  }
};
