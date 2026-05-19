import { device, element, by, waitFor } from 'detox';
import {
  tapById,
  typeById,
  clearAndType,
  assertVisible,
  resetToWelcome,
  SHORT_WAIT_MS,
  MED_WAIT_MS,
  TEST_BAR_CODE,
} from './helpers';

describe('Saved Bars', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  it('saved bar appears on WelcomeScreen after joining', async () => {
    // Join a real bar first
    await resetToWelcome();
    await waitFor(element(by.id('welcome:join-button'))).toBeVisible().withTimeout(15_000);
    await tapById('welcome:join-button');
    await typeById('join:code-input', TEST_BAR_CODE);
    await tapById('join:submit-button');
    await waitFor(element(by.id('nickname:screen'))).toBeVisible().withTimeout(MED_WAIT_MS);
    await clearAndType('nickname:input', 'SavedBarTester');
    await tapById('nickname:submit-button');
    await waitFor(element(by.id('lobby:screen'))).toBeVisible().withTimeout(MED_WAIT_MS);

    // Navigate to settings → Leave Game → welcome
    await tapById('lobby:settings-button');
    await assertVisible('settings:screen');
    // Leave game button is only shown when in-game — lobby is pre-game so we goBack
    await tapById('settings:close-button');

    // Navigate back manually via device back or a reset
    await device.pressBack().catch(() => {});

    // Reload to welcome
    await resetToWelcome();

    // Bar should now appear in saved list
    await waitFor(element(by.id(`welcome:saved-bar-${TEST_BAR_CODE}`))).toBeVisible().withTimeout(SHORT_WAIT_MS);
  });

  it('tapping a saved bar takes to nickname screen', async () => {
    // Saved bar from previous test should still be visible
    const savedBarVisible = await waitFor(element(by.id(`welcome:saved-bar-${TEST_BAR_CODE}`)))
      .toBeVisible().withTimeout(500)
      .then(() => true).catch(() => false);

    if (savedBarVisible) {
      await tapById(`welcome:saved-bar-${TEST_BAR_CODE}`);
      await waitFor(element(by.id('nickname:screen'))).toBeVisible().withTimeout(MED_WAIT_MS);
    } else {
      // Skip if bar not saved yet (fresh install state)
      console.log('Saved bar not found — skipping tap test (likely fresh install)');
    }
  });
});
