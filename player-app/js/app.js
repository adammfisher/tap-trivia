/**
 * Tap Trivia Player App — Main Controller
 * SPA routing, screen management, game lifecycle.
 */

const App = {
  currentScreen: null,

  init() {
    // Initialize screen modules
    WelcomeScreen.init();
    CreateGroupScreen.init();
    JoinBarScreen.init();

    // Bottom nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        let screen = btn.dataset.screen;
        // "Play" button is context-aware: lobby if at a bar, home otherwise
        if (screen === 'home' && Player.hasBar()) screen = 'lobby';
        if (screen) App.showScreen(screen);
      });
    });

    // Determine initial screen
    if (!Player.hasName()) {
      this.showScreen('welcome');
      return;
    }

    // Check for active game in localStorage (instant rejoin on refresh)
    const activeGame = Player.getActiveGame();
    if (activeGame) {
      const state = getGameState(activeGame.startTimeEpoch, getServerNow());
      if (state.gamePhase === 'active') {
        this.startGame(activeGame.gameId, activeGame.startTimeEpoch);
        return;
      }
      // Game is over — clear it
      Player.clearActiveGame();
    }

    if (Player.hasBar()) {
      this.showScreen('lobby');
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

    // Show bottom nav on all screens except onboarding flows
    const nav = document.getElementById('bottom-nav');
    const hideNavScreens = ['welcome', 'join-bar', 'create-group'];
    nav.classList.toggle('hidden', hideNavScreens.includes(screenId));

    this.currentScreen = screenId;

    // Trigger screen show with any extra args passed through
    const module = this.getScreenModule(screenId);
    if (module && module.show) module.show(...args);
  },

  getScreenModule(screenId) {
    const map = {
      'welcome': WelcomeScreen,
      'home': HomeScreen,
      'create-group': CreateGroupScreen,
      'join-bar': JoinBarScreen,
      'lobby': LobbyScreen,
      'game': QuestionScreen,
      'results': ResultsScreen,
      'profile': ProfileScreen
    };
    return map[screenId] || null;
  },

  startGame(gameId, startTimeEpoch) {
    Player.setActiveGame(gameId, startTimeEpoch);
    this.showScreen('game', gameId, startTimeEpoch);
  }
};

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
