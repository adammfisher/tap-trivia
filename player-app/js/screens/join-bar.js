/**
 * Tap Trivia Player App — Join Bar Screen
 * 5-character code entry with auto-advance and submit button.
 */

const JoinBarScreen = {
  init() {
    const inputs = document.querySelectorAll('.code-char');
    inputs.forEach((input, i) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = val;
        if (val && i < 4) {
          inputs[i + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          inputs[i - 1].focus();
          inputs[i - 1].value = '';
        }
        if (e.key === 'Enter') {
          this.trySubmit();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
        for (let j = 0; j < 5 && j < text.length; j++) {
          inputs[j].value = text[j];
        }
        if (text.length >= 5) {
          inputs[4].focus();
        }
      });
    });

    document.getElementById('btn-join-submit').addEventListener('click', () => {
      this.trySubmit();
    });
  },

  show() {
    const inputs = document.querySelectorAll('.code-char');
    inputs.forEach(i => { i.value = ''; });
    document.getElementById('join-bar-error').textContent = '';
    setTimeout(() => inputs[0].focus(), 100);
  },

  getCode() {
    const inputs = document.querySelectorAll('.code-char');
    return Array.from(inputs).map(i => i.value).join('').toUpperCase();
  },

  async trySubmit() {
    const code = this.getCode();
    if (code.length !== 5) return;

    const errorEl = document.getElementById('join-bar-error');
    errorEl.textContent = '';

    const result = await apiCall('POST', '/bar/join', { barCode: code });

    if (result.error) {
      errorEl.textContent = result.message || "That code doesn't match any active location or group.";
      const container = document.getElementById('code-input-container');
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 400);
      return;
    }

    // Success — save bar and go to lobby
    Player.setBar(result.barCode, result.barName);
    App.showScreen('lobby');
  }
};
