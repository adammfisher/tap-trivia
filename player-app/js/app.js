/**
 * Tap Trivia Player App — Main Controller
 * SPA routing, screen management, game lifecycle.
 */

const App = {
  currentScreen: null,

  init() {
    // Initialize screen modules
    WelcomeScreen.init();
    JoinBarScreen.init();

    // Bottom nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen) App.showScreen(screen);
      });
    });

    // Determine initial screen
    if (!Player.hasName()) {
      this.showScreen('welcome');
    } else {
      this.showScreen('home');
    }
  },

  showScreen(screenId, ...args) {
    // Hide current screen
    if (this.currentScreen) {
      const currentModule = this.getScreenModule(this.currentScreen);
      if (currentModule && currentModule.hide) currentModule.hide();
    }

    // Switch visibility
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${screenId}`);
    if (el) el.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Show bottom nav only on main screens
    const nav = document.getElementById('bottom-nav');
    const mainScreens = ['home', 'results', 'profile'];
    nav.classList.toggle('hidden', !mainScreens.includes(screenId));

    this.currentScreen = screenId;

    // Trigger screen show with any extra args passed through
    const module = this.getScreenModule(screenId);
    if (module && module.show) module.show(...args);
  },

  getScreenModule(screenId) {
    const map = {
      'welcome': WelcomeScreen,
      'home': HomeScreen,
      'join-bar': JoinBarScreen,
      'lobby': LobbyScreen,
      'game': QuestionScreen,
      'results': ResultsScreen,
      'profile': ProfileScreen
    };
    return map[screenId] || null;
  },

  startGame(gameId, startTimeEpoch) {
    this.showScreen('game', gameId, startTimeEpoch);
  }
};

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
