'use strict';

// Working copy of venue settings + the last-saved baseline, so we can detect
// unsaved changes and drive an explicit Save button (no silent auto-save).
let settingsState = {
  pending: {},   // edited values
  saved: {},     // last persisted values
  saving: false,
  status: ''     // '', 'saved', or an error message
};

function settingsDirty() {
  return Object.keys(settingsState.pending).some(
    k => settingsState.pending[k] !== settingsState.saved[k]
  );
}

function renderSettings() {
  const container = document.getElementById('screen-settings');
  if (!container) return;

  const { bar } = getAuthState();

  // Seed from the bar record once (absent housePlayersEnabled ⇒ enabled).
  if (!settingsState._seeded) {
    const housePlayersOn = !bar || bar.housePlayersEnabled !== false;
    settingsState.saved = { housePlayersEnabled: housePlayersOn };
    settingsState.pending = { ...settingsState.saved };
    settingsState._seeded = true;
  }

  const houseOn = settingsState.pending.housePlayersEnabled;
  const dirty = settingsDirty();

  let statusHTML = '';
  if (settingsState.status === 'saved') {
    statusHTML = '<span class="settings-status settings-status--ok">&#x2713; Saved</span>';
  } else if (settingsState.status) {
    statusHTML = `<span class="settings-status settings-status--err">${settingsState.status}</span>`;
  } else if (dirty) {
    statusHTML = '<span class="settings-status settings-status--dirty">Unsaved changes</span>';
  }

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-desc">Configure how your trivia games run at ${bar ? bar.barName : 'your location'}</p>
      </div>

      <div class="dash-card setting-block">
        <div class="setting-block-main">
          <div class="setting-block-text">
            <div class="setting-block-title">House Players</div>
            <div class="setting-block-desc">
              Fills empty leaderboards so games never look dead. Adds up to
              <strong>3 house players</strong> when fewer than 3 real players are in a
              game. They're removed one-for-one as real players join, and a real
              player always ranks&nbsp;#1. House players never appear in cross-venue
              standings.
            </div>
          </div>
          <div class="setting-toggle-col">
            <button class="big-toggle ${houseOn ? 'on' : ''}" id="set-house-toggle" role="switch" aria-checked="${houseOn}">
              <span class="big-toggle-knob"></span>
            </button>
            <span class="big-toggle-state ${houseOn ? 'on' : 'off'}">${houseOn ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      <div class="settings-actions">
        ${statusHTML}
        <button class="btn-primary" id="set-save-btn" ${dirty && !settingsState.saving ? '' : 'disabled'}>
          ${settingsState.saving ? 'Saving&hellip;' : 'Save Changes'}
        </button>
      </div>
    </div>
  `;

  const toggle = document.getElementById('set-house-toggle');
  toggle.addEventListener('click', () => {
    settingsState.pending.housePlayersEnabled = !settingsState.pending.housePlayersEnabled;
    settingsState.status = ''; // clear stale "Saved" once they edit again
    renderSettings();
  });

  document.getElementById('set-save-btn').addEventListener('click', saveSettings);
}

async function saveSettings() {
  if (settingsState.saving || !settingsDirty()) return;

  settingsState.saving = true;
  settingsState.status = '';
  renderSettings();

  try {
    const payload = { housePlayersEnabled: settingsState.pending.housePlayersEnabled };
    await apiCall('PUT', '/dashboard/settings', payload);

    // Persist locally so other screens + a re-render reflect the new baseline.
    settingsState.saved = { ...settingsState.pending };
    settingsState.status = 'saved';
    const { bar } = getAuthState();
    if (bar) bar.housePlayersEnabled = payload.housePlayersEnabled;
  } catch (err) {
    console.error('Failed to save settings:', err);
    settingsState.status = (err && err.message) ? `Couldn't save — ${err.message}` : "Couldn't save. Try again.";
  } finally {
    settingsState.saving = false;
    renderSettings();
  }
}

// Reset the seeded working copy (e.g. on logout / bar switch) so the next open
// re-reads from the bar record.
function resetSettingsState() {
  settingsState = { pending: {}, saved: {}, saving: false, status: '', _seeded: false };
}
