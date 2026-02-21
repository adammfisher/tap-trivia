/**
 * Tap Trivia Player App — Welcome Screen
 * First visit: pick a display name.
 */

const WelcomeScreen = {
  init() {
    const input = document.getElementById('welcome-name-input');
    const btn = document.getElementById('btn-welcome-go');

    btn.addEventListener('click', () => this.submit());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });
  },

  show() {
    const input = document.getElementById('welcome-name-input');
    const msgEl = document.getElementById('welcome-name-message');
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.className = 'welcome-name-message hidden';
    }
    setTimeout(() => input.focus(), 100);
  },

  async submit() {
    const input = document.getElementById('welcome-name-input');
    const name = input.value.trim();

    if (!this.validateName(name)) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }

    const btn = document.getElementById('btn-welcome-go');
    btn.textContent = 'Setting up...';
    btn.disabled = true;

    Player.getId(); // Generate UUID if needed

    // Register with backend (may dedup the name)
    const result = await apiCall('PUT', `/player/${Player.getId()}`, { displayName: name });

    if (result && !result.error) {
      const effectiveName = result.displayName || name;
      Player.setName(effectiveName);

      if (result.nameWasAdjusted) {
        // Name was taken — show message, let them change it or continue
        input.value = effectiveName;
        const msgEl = document.getElementById('welcome-name-message');
        if (msgEl) {
          msgEl.textContent = `"${name}" was taken — you're "${effectiveName}". Edit above or continue!`;
          msgEl.className = 'welcome-name-message welcome-name-adjusted';
        }
        btn.textContent = "LET'S PLAY";
        btn.disabled = false;
        return;
      }
    } else {
      Player.setName(name);
    }

    btn.textContent = "LET'S PLAY";
    btn.disabled = false;

    App.showScreen('home');
  },

  validateName(name) {
    return name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9 _]+$/.test(name);
  }
};
