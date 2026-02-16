'use strict';

function renderDashboard() {
  const container = document.getElementById('screen-dashboard');
  if (!container) return;

  const { bar, data } = getAuthState();
  const barName = bar ? bar.barName : 'Your Bar';
  const signage = bar && bar.signage ? bar.signage : { slides: [], enabled: false };
  const slideCount = signage.slides ? signage.slides.filter(s => s.enabled).length : 0;
  const analytics = data && data.analytics ? data.analytics : {};

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
          <div class="stat-value">${analytics.avgSession || '0m'}</div>
          <div class="stat-label">Avg session</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(118,75,162,.15)">&#x1F3C6;</div>
          <div class="stat-value">${analytics.peakPlayers || 0}</div>
          <div class="stat-label">Peak players</div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-card quick-actions-card">
          <div class="card-title">Quick Actions</div>
          <div class="quick-action" id="qa-signage">
            <span class="qa-icon">&#x1F4FA;</span>
            <div>
              <div class="qa-title">Create Signage</div>
              <div class="qa-desc">Design &amp; manage TV slides</div>
            </div>
          </div>
          <div class="quick-action" id="qa-logo">
            <span class="qa-icon">&#x1F5BC;</span>
            <div>
              <div class="qa-title">Upload Logo</div>
              <div class="qa-desc">Brand your TV display</div>
            </div>
          </div>
        </div>
        <div class="dash-card bar-code-card">
          <div class="card-title">Your Bar Code</div>
          <div class="bar-code-display">${bar ? bar.barCode : '-----'}</div>
          <div class="bar-code-hint">Displayed on your TV for patrons to join</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-go-signage').addEventListener('click', () => DashApp.showScreen('signage'));
  document.getElementById('qa-signage').addEventListener('click', () => DashApp.showScreen('signage'));
  document.getElementById('qa-logo').addEventListener('click', () => DashApp.showScreen('logo'));
}
