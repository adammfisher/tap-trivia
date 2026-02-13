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
    Player.setName(name);

    // Register with backend
    await apiCall('PUT', `/player/${Player.getId()}`, { displayName: name });

    btn.textContent = "LET'S PLAY";
    btn.disabled = false;

    App.showScreen('home');
  },

  validateName(name) {
    return name.length >= 2 && name.length <= 16 && /^[a-zA-Z0-9 ]+$/.test(name);
  }
};
