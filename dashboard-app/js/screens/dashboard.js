'use strict';

function renderDashboard() {
  const container = document.getElementById('screen-dashboard');
  if (!container) return;

  const { bar, data } = getAuthState();
  const barName = bar ? bar.barName : 'Your Location';
  const signage = bar && bar.signage ? bar.signage : { slides: [], enabled: false };
  const slideCount = signage.slides ? signage.slides.filter(s => s.enabled).length : 0;
  const analytics = data && data.analytics ? data.analytics : {};

  // Tonight's schedule — filter slides active today
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const todaySlides = (signage.slides || []).filter(s => {
    if (!s.days || s.days.length === 0) return true;
    return s.days.includes(today);
  });

  const scheduleHTML = todaySlides.length > 0
    ? todaySlides.map(s => {
        const statusClass = s.enabled ? 'schedule-active' : 'schedule-off';
        const statusLabel = s.enabled ? 'ACTIVE' : 'OFF';
        return `
          <div class="schedule-row">
            <span class="schedule-icon">${s.icon || '\u{1F4FA}'}</span>
            <span class="schedule-name">${s.name || s.templateId || 'Slide'}</span>
            <span class="schedule-status ${statusClass}">${statusLabel}</span>
          </div>`;
      }).join('')
    : '<div class="schedule-empty">No slides scheduled for today</div>';

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-desc">Welcome back, ${barName}</p>
      </div>

      <div class="tv-status-card dash-card">
        <div class="tv-status-left">
          <div class="status-dot status-dot--lg"></div>
          <div>
            <div class="tv-status-title">${slideCount > 0 ? 'Signage active' : 'No signage configured'}</div>
            <div class="tv-status-desc">${slideCount} slide${slideCount !== 1 ? 's' : ''} in rotation</div>
          </div>
        </div>
        <button class="btn-primary" id="btn-go-signage">Create Signage &rarr;</button>
      </div>

      <div class="stat-row">
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(102,126,234,.15)">&#x1F465;</div>
          <div class="stat-value">${analytics.playersThisWeek || 0}</div>
          <div class="stat-label">Players this week</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(0,212,170,.15)">&#x1F3AE;</div>
          <div class="stat-value">${analytics.gamesThisWeek || 0}</div>
          <div class="stat-label">Games played</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,.15)">&#x23F1;</div>
          <div class="stat-value">${analytics.avgSessionMin ? analytics.avgSessionMin + 'm' : '0m'}</div>
          <div class="stat-label">Avg session</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(118,75,162,.15)">&#x1F3C6;</div>
          <div class="stat-value">${analytics.peakPlayers || 0}</div>
          <div class="stat-label">Peak players</div>
        </div>
      </div>

      <div class="dash-bottom-grid">
        <div class="dash-card schedule-card">
          <div class="card-title">Tonight's Schedule</div>
          ${scheduleHTML}
        </div>

        <div class="dash-actions-col">
          <div class="dash-card action-card" id="qa-signage">
            <span class="action-card-icon">&#x1F4FA;</span>
            <div class="action-card-title">Create Signage</div>
            <div class="action-card-desc">Design &amp; manage TV slides</div>
          </div>
          <div class="dash-card action-card" id="qa-analytics">
            <span class="action-card-icon">&#x1F4C8;</span>
            <div class="action-card-title">View Analytics</div>
            <div class="action-card-desc">Player trends, peak hours</div>
          </div>
          <div class="dash-card action-card" id="qa-logo">
            <span class="action-card-icon">&#x1F5BC;</span>
            <div class="action-card-title">Logo &amp; Branding</div>
            <div class="action-card-desc">Upload your location logo</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-go-signage').addEventListener('click', () => DashApp.showScreen('signage'));
  document.getElementById('qa-signage').addEventListener('click', () => DashApp.showScreen('signage'));
  document.getElementById('qa-analytics').addEventListener('click', () => DashApp.showScreen('analytics'));
  document.getElementById('qa-logo').addEventListener('click', () => DashApp.showScreen('logo'));
}
