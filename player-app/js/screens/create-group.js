/**
 * Tap Trivia Player App — Create Group Screen
 * Create a persistent friend group and get a shareable code.
 */

const CreateGroupScreen = {
  _bound: false,

  init() {
    if (this._bound) return;

    document.getElementById('btn-create-group-submit').addEventListener('click', () => {
      this.tryCreate();
    });

    document.getElementById('create-group-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.tryCreate();
    });

    document.getElementById('btn-create-group-share').addEventListener('click', () => {
      this.shareCode();
    });

    document.getElementById('btn-create-group-continue').addEventListener('click', () => {
      App.showScreen('lobby');
    });

    this._bound = true;
  },

  show() {
    // Reset to form state
    document.getElementById('create-group-form').classList.remove('hidden');
    document.getElementById('create-group-success').classList.add('hidden');
    document.getElementById('create-group-name').value = '';
    document.getElementById('create-group-error').textContent = '';
    setTimeout(() => document.getElementById('create-group-name').focus(), 100);
  },

  async tryCreate() {
    const nameInput = document.getElementById('create-group-name');
    const name = nameInput.value.trim();

    if (name.length < 2 || name.length > 30) {
      document.getElementById('create-group-error').textContent = 'Group name must be 2-30 characters';
      return;
    }

    document.getElementById('create-group-error').textContent = '';

    const result = await apiCall('POST', '/group/create', { groupName: name });

    if (result.error) {
      document.getElementById('create-group-error').textContent = result.message || 'Failed to create group';
      return;
    }

    // Auto-join the group
    await apiCall('POST', '/bar/join', { barCode: result.barCode });
    Player.setBar(result.barCode, result.barName, 'group');

    // Show success state
    document.getElementById('create-group-form').classList.add('hidden');
    document.getElementById('create-group-success').classList.remove('hidden');
    document.getElementById('create-group-code-display').textContent = result.barCode;
    document.getElementById('create-group-name-display').textContent = result.barName;
  },

  async shareCode() {
    const code = document.getElementById('create-group-code-display').textContent;
    const name = document.getElementById('create-group-name-display').textContent;
    const text = `Join my TapTrivia group "${name}"! Use code: ${code}\n\nhttps://taptrivia.tv`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('btn-create-group-share');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Share Code'; }, 2000);
      } catch { /* ignore */ }
    }
  },

  hide() {}
};
