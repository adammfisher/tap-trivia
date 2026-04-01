/**
 * Tap Trivia Player App — Profile Screen
 * Display name, location status, stats, how to play.
 */

const ProfileScreen = {
  async show() {
    const container = document.getElementById('profile-content');

    // Fetch latest player data
    const player = await apiCall('GET', `/player/${Player.getId()}`);

    const name = Player.getName();
    const barCode = Player.getBarCode();
    const barName = Player.getBarName();

    container.innerHTML = `
      <div class="profile-section">
        <label class="profile-label">DISPLAY NAME</label>
        <div class="profile-name-edit">
          <input type="text" id="profile-name-input" class="profile-name-input"
            value="${name}" maxlength="20" pattern="[a-zA-Z0-9 _]+">
          <button id="btn-save-name" class="btn-save" onclick="ProfileScreen.saveName()">Save</button>
        </div>
        <div id="profile-name-message" class="profile-name-message hidden"></div>
      </div>

      <div class="profile-section">
        <label class="profile-label">CURRENT LOCATION</label>
        ${barCode
          ? `<div class="profile-bar">
              <span>${barName} (${barCode})</span>
              <button class="btn-link" onclick="App.showScreen('join-bar')">Change Location</button>
              <button class="btn-link btn-danger" onclick="ProfileScreen.leaveBar()">Leave Location</button>
            </div>`
          : `<button class="btn-link" onclick="App.showScreen('join-bar')">Join a Location</button>`
        }
      </div>

      ${this._buildBarHistoryHtml(barCode)}

      <div class="profile-section">
        <label class="profile-label">STATS</label>
        <div class="profile-stats">
          <div class="stat-item">
            <div class="stat-value">${player && !player.error ? player.gamesPlayed || 0 : 0}</div>
            <div class="stat-label">Games</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${player && !player.error ? (player.totalPoints || 0).toLocaleString() : 0}</div>
            <div class="stat-label">Total Points</div>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <button class="btn-how-to-play" onclick="ProfileScreen.toggleHowToPlay()">How to Play ▾</button>
        <div id="how-to-play" class="how-to-play hidden">
          <p>🎯 <strong>15 questions per game</strong> — answer on your phone!</p>
          <p>⏱ <strong>60 seconds per question</strong> — faster answers = more points</p>
          <p>📖 <strong>8-second read time</strong> — full 1000 points for the first 8 seconds</p>
          <p>🔄 <strong>Change your answer</strong> — switch anytime before the reveal</p>
          <p>💡 <strong>Hints at 20s and 35s</strong> — wrong answers get eliminated</p>
          <p>🏆 <strong>Location leaderboard</strong> — compete with people at your location</p>
          <p>🌎 <strong>Global leaderboard</strong> — see how you rank worldwide after each game</p>
          <p>📅 <strong>Games every 15 min</strong> — 5 PM ET to 12 AM PT, every night</p>
        </div>
      </div>
    `;
  },

  async saveName() {
    const input = document.getElementById('profile-name-input');
    const msgEl = document.getElementById('profile-name-message');
    const name = input.value.trim();

    if (name.length < 2 || name.length > 20 || !/^[a-zA-Z0-9 _]+$/.test(name)) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }

    const result = await apiCall('PUT', `/player/${Player.getId()}`, { displayName: name });

    if (result && result.error) {
      msgEl.textContent = result.message || 'Failed to save name.';
      msgEl.className = 'profile-name-message profile-name-error';
      return;
    }

    const effectiveName = (result && result.displayName) ? result.displayName : name;
    Player.setName(effectiveName);
    input.value = effectiveName;

    const btn = document.getElementById('btn-save-name');

    if (result && result.nameWasAdjusted) {
      // Name was taken — show message and let user edit
      msgEl.textContent = `That name was taken — saved as "${effectiveName}". Edit above if you'd like.`;
      msgEl.className = 'profile-name-message profile-name-adjusted';
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = 'Save'; }, 2000);
    } else {
      msgEl.textContent = '';
      msgEl.className = 'profile-name-message hidden';
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = 'Save'; }, 1500);
    }
  },

  async leaveBar() {
    Player.clearBar();
    this.show();
  },

  toggleHowToPlay() {
    document.getElementById('how-to-play').classList.toggle('hidden');
  },

  _buildBarHistoryHtml(currentBarCode) {
    const history = Player.getBarHistory();
    if (history.length === 0) return '';

    const cards = history.map(bar => {
      const isActive = bar.code === currentBarCode;
      return `
        <div class="profile-bar-card ${isActive ? 'profile-bar-card--active' : ''}">
          <div class="profile-bar-card__info">
            <div class="profile-bar-card__name">${bar.name}</div>
            <div class="profile-bar-card__code">${bar.code}</div>
          </div>
          ${isActive
            ? '<span class="profile-bar-card__badge">Current</span>'
            : `<button class="profile-bar-card__join" onclick="ProfileScreen.joinBar('${bar.code}')">Join</button>`
          }
        </div>
      `;
    }).join('');

    return `
      <div class="profile-section">
        <label class="profile-label">MY LOCATIONS</label>
        <div class="profile-bars">${cards}</div>
      </div>
    `;
  },

  async joinBar(code) {
    const result = await apiCall('POST', '/bar/join', { barCode: code });
    if (result && !result.error) {
      Player.setBar(result.barCode, result.barName);
      App.showScreen('lobby');
    }
  }
};
