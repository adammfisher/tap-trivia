/**
 * Tap Trivia Player App — Home Screen
 * "Join a Game" / "How It Works" layout.
 */

const HomeScreen = {
  _bound: false,

  show() {
    if (!this._bound) {
      document.getElementById('btn-join-game').addEventListener('click', () => {
        App.showScreen('join-bar');
      });

      document.getElementById('btn-create-group').addEventListener('click', () => {
        App.showScreen('create-group');
      });

      document.getElementById('btn-how-it-works').addEventListener('click', () => {
        App.showScreen('profile');
      });

      this._bound = true;
    }
  },

  hide() {}
};
