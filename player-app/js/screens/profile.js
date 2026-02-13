/**
 * Tap Trivia Player App — Profile Screen
 * Display name, bar status, stats, how to play.
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
            value="${name}" maxlength="16" pattern="[a-zA-Z0-9 ]+">
          <button id="btn-save-name" class="btn-save" onclick="ProfileScreen.saveName()">Save</button>
        </div>
      </div>

      <div class="profile-section">
        <label class="profile-label">CURRENT BAR</label>
        ${barCode
          ? `<div class="profile-bar">
              <span>${barName} (${barCode})</span>
              <button class="btn-link" onclick="App.showScreen('join-bar')">Change Bar</button>
              <button class="btn-link btn-danger" onclick="ProfileScreen.leaveBar()">Leave Bar</button>
            </div>`
          : `<button class="btn-link" onclick="App.showScreen('join-bar')">Join a Bar</button>`
        }
      </div>

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
          <p>🏆 <strong>Bar leaderboard</strong> — compete with people at your bar</p>
          <p>🌎 <strong>Global leaderboard</strong> — see how you rank worldwide after each game</p>
          <p>📅 <strong>Games every 15 min</strong> — 5 PM ET to 12 AM PT, every night</p>
        </div>
      </div>
    `;
  },

  async saveName() {
    const input = document.getElementById('profile-name-input');
    const name = input.value.trim();

    if (name.length < 2 || name.length > 16 || !/^[a-zA-Z0-9 ]+$/.test(name)) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }

    Player.setName(name);
    await apiCall('PUT', `/player/${Player.getId()}`, { displayName: name });

    const btn = document.getElementById('btn-save-name');
    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = 'Save'; }, 1500);
  },

  async leaveBar() {
    Player.clearBar();
    this.show();
  },

  toggleHowToPlay() {
    document.getElementById('how-to-play').classList.toggle('hidden');
  }
};
