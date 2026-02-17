'use strict';

let analyticsState = {
  period: 'week',
  loading: false,
  data: null,
  error: ''
};

async function loadAnalytics(period) {
  analyticsState.period = period;
  analyticsState.loading = true;
  analyticsState.error = '';
  renderAnalytics();

  try {
    const result = await apiCall('GET', `/dashboard/data?period=${period}`);
    // Update global auth state so dashboard also has fresh data
    setAuthState(result.bar, result);
    analyticsState.data = result.analytics;
    analyticsState.loading = false;
    renderAnalytics();
  } catch (err) {
    analyticsState.loading = false;
    analyticsState.error = err.message || 'Failed to load analytics';
    renderAnalytics();
  }
}

function renderAnalytics() {
  const container = document.getElementById('screen-analytics');
  if (!container) return;

  const { data: authData } = getAuthState();
  const a = analyticsState.data || (authData && authData.analytics) || {};
  const period = analyticsState.period;

  const periodLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time'
  };

  // Bar chart — players per day
  const ppd = a.playersPerDay || [];
  const maxDayPlayers = Math.max(1, ...ppd.map(d => d.players));

  const barChartHTML = ppd.map(d => {
    const pct = maxDayPlayers > 0 ? Math.round((d.players / maxDayPlayers) * 100) : 0;
    return `
      <div class="an-bar-col">
        <div class="an-bar-value">${d.players || ''}</div>
        <div class="an-bar" style="height:${Math.max(pct, 4)}%"></div>
        <div class="an-bar-label">${d.day}</div>
      </div>`;
  }).join('');

  // Peak hours — horizontal bars
  const peakHours = a.peakHours || [];
  const peakHoursHTML = peakHours.map(h => `
    <div class="an-hbar-row">
      <span class="an-hbar-label">${h.label}</span>
      <div class="an-hbar-track">
        <div class="an-hbar-fill" style="width:${h.pct || 0}%"></div>
      </div>
      <span class="an-hbar-value">${h.pct}%</span>
    </div>
  `).join('');

  // Popular categories
  const categories = a.popularCategories || [];
  const maxCatTotal = Math.max(1, ...categories.map(c => c.total));
  const catColors = ['#00d4aa', '#667eea', '#ffd200', '#764ba2', '#ff4757', '#f59e0b'];
  const categoriesHTML = categories.map((c, i) => {
    const pct = Math.round((c.total / maxCatTotal) * 100);
    return `
      <div class="an-cat-row">
        <span class="an-cat-dot" style="background:${catColors[i % catColors.length]}"></span>
        <span class="an-cat-name">${c.category}</span>
        <span class="an-cat-pct">${c.correctPct}%</span>
      </div>`;
  }).join('');

  // Retention
  const ret = a.retention || { total: 0, multiGame: 0, multiNight: 0 };

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header an-header">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-desc">Player engagement and performance</p>
        </div>
        <div class="an-period-tabs">
          ${Object.entries(periodLabels).map(([key, label]) => `
            <button class="an-period-tab ${period === key ? 'active' : ''}" data-period="${key}">${label}</button>
          `).join('')}
        </div>
      </div>

      ${analyticsState.loading ? '<div class="an-loading">Loading analytics...</div>' : ''}
      ${analyticsState.error ? `<div class="auth-error">${analyticsState.error}</div>` : ''}

      <div class="stat-row">
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(102,126,234,.15)">&#x1F465;</div>
          <div class="stat-value">${a.totalPlayers || 0}</div>
          <div class="stat-label">Total players</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(0,212,170,.15)">&#x1F3AE;</div>
          <div class="stat-value">${a.gamesThisWeek || 0}</div>
          <div class="stat-label">Games played</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,.15)">&#x23F1;</div>
          <div class="stat-value">${a.avgSessionMin ? a.avgSessionMin + 'm' : '0m'}</div>
          <div class="stat-label">Avg session</div>
        </div>
        <div class="dash-card stat-card">
          <div class="stat-icon" style="background:rgba(118,75,162,.15)">&#x2705;</div>
          <div class="stat-value">${a.avgCorrect || 0}%</div>
          <div class="stat-label">Avg correct</div>
        </div>
      </div>

      <div class="an-charts-grid">
        <div class="dash-card an-chart-card an-chart-wide">
          <div class="card-title">Players Per Game</div>
          <div class="an-bar-chart">
            ${barChartHTML || '<div class="an-empty">No data yet</div>'}
          </div>
        </div>

        <div class="dash-card an-chart-card">
          <div class="card-title">Popular Categories</div>
          <div class="an-cat-list">
            ${categoriesHTML || '<div class="an-empty">No data yet</div>'}
          </div>
        </div>

        <div class="dash-card an-chart-card an-chart-wide">
          <div class="card-title">Peak Hours</div>
          <div class="an-hbar-list">
            ${peakHoursHTML || '<div class="an-empty">No data yet</div>'}
          </div>
        </div>

        <div class="dash-card an-chart-card">
          <div class="card-title">Player Retention</div>
          <div class="an-retention">
            <div class="an-ret-row">
              <span class="an-ret-label">Played 1 game</span>
              <span class="an-ret-value">${ret.total}</span>
            </div>
            <div class="an-ret-row">
              <span class="an-ret-label">Returned same night</span>
              <span class="an-ret-value">${ret.multiGame}</span>
            </div>
            <div class="an-ret-row">
              <span class="an-ret-label">Came back another night</span>
              <span class="an-ret-value">${ret.multiNight}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Period tab listeners
  container.querySelectorAll('.an-period-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.period;
      if (p && p !== analyticsState.period) loadAnalytics(p);
    });
  });

  // If we have no data yet and not loading, fetch it
  if (!analyticsState.data && !analyticsState.loading) {
    loadAnalytics(period);
  }
}
