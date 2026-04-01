'use strict';

/**
 * TapTrivia Dashboard — Main Controller
 * SPA routing, screen management.
 */

const DashApp = {
  currentScreen: null,

  async init() {
    const hasSession = await checkSession();
    if (hasSession) {
      this.enterDashboard();
    } else {
      this.showScreen('login');
    }
  },

  showScreen(screenId) {
    // Hide everything first
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('dashboard-layout').classList.add('hidden');

    document.querySelectorAll('.dash-screen').forEach(s => s.classList.remove('active'));

    this.currentScreen = screenId;

    if (screenId === 'login') {
      document.getElementById('screen-login').classList.add('active');
      initLogin();
      return;
    }

    // Dashboard screens
    document.getElementById('dashboard-layout').classList.remove('hidden');
    const el = document.getElementById(`screen-${screenId}`);
    if (el) el.classList.add('active');

    this.renderSidebar(screenId);

    if (screenId === 'dashboard') renderDashboard();
    else if (screenId === 'signage') renderSignageEditor();
    else if (screenId === 'analytics') renderAnalytics();
    else if (screenId === 'logo') renderLogoUpload();
  },

  enterDashboard() {
    this.showScreen('dashboard');
  },

  renderSidebar(activePage) {
    const { bar } = getAuthState();
    const barName = bar ? bar.barName : 'Your Location';
    const barCode = bar ? bar.barCode : '-----';
    const logoUrl = bar ? bar.logoUrl : null;

    const navItems = [
      { key: 'dashboard', icon: '\u{1F3E0}', label: 'Dashboard' },
      { key: 'signage', icon: '\u{1F4FA}', label: 'Signage Creator' },
      { key: 'analytics', icon: '\u{1F4CA}', label: 'Analytics' },
      { key: 'logo', icon: '\u{1F5BC}', label: 'Logo & Branding' },
    ];

    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <span class="logo-text"><span class="logo-tap">Tap</span><span class="logo-trivia">Trivia</span></span>
        <div class="sidebar-subtitle">LOCATION DASHBOARD</div>
      </div>
      <div class="sidebar-bar-info">
        <div class="sidebar-bar-logo">${logoUrl
          ? `<img src="${logoUrl}" alt="${barName}" class="sidebar-bar-img">`
          : `<span class="sidebar-bar-initial">${barName.charAt(0)}</span>`
        }</div>
        <div>
          <div class="sidebar-bar-name">${barName}</div>
          <div class="sidebar-bar-code-row">
            <span class="status-dot"></span>
            <span class="sidebar-bar-code">${barCode}</span>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(n => `
          <button class="nav-item ${activePage === n.key ? 'active' : ''}" data-page="${n.key}">
            <span class="nav-icon">${n.icon}</span>${n.label}
          </button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="btn-text link-muted" id="btn-logout">Sign out</button>
        <div class="sidebar-version">v1.0 &middot; taptrivia.tv</div>
      </div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page && page !== activePage) DashApp.showScreen(page);
      });
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      clearAuthState();
      DashApp.showScreen('login');
    });
  }
};

// Global helper used by login.js
function showScreen(screenId) {
  DashApp.showScreen(screenId);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DashApp.init());
} else {
  DashApp.init();
}
