import { device, element, by, waitFor } from 'detox';
import {
  tapById,
  clearAndType,
  assertVisible,
  navigateToLobbyViaSolo,
  SHORT_WAIT_MS,
  MED_WAIT_MS,
} from './helpers';

describe('Settings', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
    await navigateToLobbyViaSolo('SettingsTestPlayer');
  });

  describe('Open from Lobby', () => {
    it('opens settings from lobby', async () => {
      await tapById('lobby:settings-button');
      await assertVisible('settings:screen');
    });

    it('shows nickname in settings', async () => {
      await assertVisible('settings:nickname-display');
    });

    it('shows edit nickname button', async () => {
      await assertVisible('settings:edit-nickname-button');
    });

    it('close button dismisses settings', async () => {
      await tapById('settings:close-button');
      await assertVisible('lobby:screen');
    });
  });

  describe('Edit Nickname', () => {
    beforeEach(async () => {
      await tapById('lobby:settings-button');
      await assertVisible('settings:screen');
      await tapById('settings:edit-nickname-button');
    });

    afterEach(async () => {
      // Ensure we're back at settings or lobby
      const onEditNickname = await waitFor(element(by.id('edit-nickname:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onEditNickname) {
        await tapById('edit-nickname:cancel-button');
      }
      const onSettings = await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onSettings) {
        await tapById('settings:close-button');
      }
    });

    it('shows edit nickname screen with input', async () => {
      await assertVisible('edit-nickname:screen');
      await assertVisible('edit-nickname:input');
    });

    it('cancel returns to settings', async () => {
      await tapById('edit-nickname:cancel-button');
      await assertVisible('settings:screen');
    });

    it('save button is visible', async () => {
      await assertVisible('edit-nickname:save-button');
    });

    it('saves a new nickname successfully', async () => {
      await clearAndType('edit-nickname:input', 'NewName123');
      await tapById('edit-nickname:save-button');
      await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
      // Nickname display should now reflect the new name
      await assertVisible('settings:nickname-display');
    });

    it('cannot save an empty nickname', async () => {
      await element(by.id('edit-nickname:input')).clearText();
      await tapById('edit-nickname:save-button');
      // Should stay on edit screen (save is disabled when empty)
      await assertVisible('edit-nickname:screen');
    });
  });

  describe('Feedback', () => {
    beforeEach(async () => {
      await tapById('lobby:settings-button');
      await assertVisible('settings:screen');
      await tapById('settings:feedback-button');
      await assertVisible('feedback:screen');
    });

    afterEach(async () => {
      const onFeedback = await waitFor(element(by.id('feedback:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onFeedback) {
        await tapById('feedback:cancel-button');
      }
      const onSettings = await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onSettings) {
        await tapById('settings:close-button');
      }
    });

    it('shows feedback form with message input', async () => {
      await assertVisible('feedback:message-input');
    });

    it('shows submit button', async () => {
      await assertVisible('feedback:submit-button');
    });

    it('shows category options', async () => {
      await assertVisible('feedback:category-general');
      await assertVisible('feedback:category-bug');
      await assertVisible('feedback:category-feature');
    });

    it('cancel returns to settings', async () => {
      await tapById('feedback:cancel-button');
      await assertVisible('settings:screen');
    });

    it('can select different feedback categories', async () => {
      await tapById('feedback:category-bug');
      await tapById('feedback:category-feature');
      await tapById('feedback:category-general');
      // Should still be on feedback screen
      await assertVisible('feedback:screen');
    });

    it('submits feedback successfully with valid message', async () => {
      await clearAndType('feedback:message-input', 'E2E test feedback - please ignore this automated test message');
      await tapById('feedback:submit-button');
      await waitFor(element(by.id('feedback:success'))).toBeVisible().withTimeout(MED_WAIT_MS);
    });
  });

  describe('Terms and Privacy', () => {
    beforeEach(async () => {
      await tapById('lobby:settings-button');
      await assertVisible('settings:screen');
    });

    afterEach(async () => {
      const onTerms = await waitFor(element(by.id('terms:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onTerms) {
        await tapById('terms:close-button');
      }
      const onPrivacy = await waitFor(element(by.id('privacy:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onPrivacy) {
        await tapById('privacy:close-button');
      }
      const onSettings = await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(500).then(() => true).catch(() => false);
      if (onSettings) {
        await tapById('settings:close-button');
      }
    });

    it('terms button is visible', async () => {
      await assertVisible('settings:terms-button');
    });

    it('privacy button is visible', async () => {
      await assertVisible('settings:privacy-button');
    });

    it('Terms of Service opens via external link (button exists)', async () => {
      // Terms opens Linking.openURL — just verify button is tappable
      await tapById('settings:terms-button');
      // Should remain on settings (opens external browser)
      await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
    });

    it('Privacy Policy opens via external link (button exists)', async () => {
      await tapById('settings:privacy-button');
      // Should remain on settings (opens external browser)
      await waitFor(element(by.id('settings:screen'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
    });
  });
});
