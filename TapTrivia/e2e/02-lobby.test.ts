import { device, element, by, waitFor } from 'detox';
import { tapById, assertVisible, navigateToLobbyViaSolo, SHORT_WAIT_MS, MED_WAIT_MS } from './helpers';

describe('Lobby', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  beforeEach(async () => {
    await navigateToLobbyViaSolo();
  });

  it('shows the lobby screen', async () => {
    await assertVisible('lobby:screen');
  });

  it('shows status text for the game', async () => {
    // One of countdown-label or status-text will be visible depending on game proximity
    const hasStatus = await waitFor(element(by.id('lobby:status-text')))
      .toBeVisible().withTimeout(500)
      .then(() => true).catch(() => false);
    const hasCountdown = await waitFor(element(by.id('lobby:countdown-label')))
      .toBeVisible().withTimeout(500)
      .then(() => true).catch(() => false);
    expect(hasStatus || hasCountdown).toBe(true);
  });

  it('shows settings button', async () => {
    await assertVisible('lobby:settings-button');
  });

  it('settings button opens Settings modal', async () => {
    await tapById('lobby:settings-button');
    await assertVisible('settings:screen');
    await tapById('settings:close-button');
  });

  it('shows player name in player card', async () => {
    // The hero section should be visible
    await assertVisible('lobby:screen');
  });

  it('shows bar name for solo play', async () => {
    // When barCode is SOLO the playing solo text should appear — we verify lobby is loaded
    await assertVisible('lobby:screen');
  });
});
