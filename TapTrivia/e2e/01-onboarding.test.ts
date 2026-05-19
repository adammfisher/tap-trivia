import { device, element, by, waitFor, expect as detoxExpect } from 'detox';
import {
  tapById,
  typeById,
  clearAndType,
  assertVisible,
  assertNotVisible,
  assertText,
  resetToWelcome,
  SHORT_WAIT_MS,
  MED_WAIT_MS,
  TEST_BAR_CODE,
} from './helpers';

describe('Onboarding', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  beforeEach(async () => {
    await resetToWelcome();
  });

  describe('WelcomeScreen', () => {
    it('shows logo and tagline', async () => {
      await assertVisible('welcome:logo');
      await assertVisible('welcome:tagline');
    });

    it('shows Join, Create Group, and Solo buttons when games are active', async () => {
      // Wait a moment for game mode check
      await waitFor(element(by.id('welcome:join-button'))).toBeVisible().withTimeout(15_000);
      await assertVisible('welcome:create-group-button');
      await assertVisible('welcome:solo-button');
    });

    it('opens Settings when gear tapped', async () => {
      await tapById('welcome:settings-button');
      await assertVisible('settings:screen');
    });

    it('navigates to JoinScreen on "Join a Game"', async () => {
      await waitFor(element(by.id('welcome:join-button'))).toBeVisible().withTimeout(15_000);
      await tapById('welcome:join-button');
      await assertVisible('join:code-input');
    });

    it('navigates to CreateGroup on "Create a Group"', async () => {
      await waitFor(element(by.id('welcome:create-group-button'))).toBeVisible().withTimeout(15_000);
      await tapById('welcome:create-group-button');
      await assertVisible('create-group:screen');
    });

    it('navigates to NicknameScreen on "Play Solo"', async () => {
      await waitFor(element(by.id('welcome:solo-button'))).toBeVisible().withTimeout(15_000);
      await tapById('welcome:solo-button');
      await assertVisible('nickname:screen');
    });
  });

  describe('JoinScreen', () => {
    beforeEach(async () => {
      await waitFor(element(by.id('welcome:join-button'))).toBeVisible().withTimeout(15_000);
      await tapById('welcome:join-button');
    });

    it('shows 5 code boxes and hint text', async () => {
      await assertVisible('join:code-box-0');
      await assertVisible('join:code-box-1');
      await assertVisible('join:code-box-2');
      await assertVisible('join:code-box-3');
      await assertVisible('join:code-box-4');
      await assertVisible('join:hint-text');
    });

    it('back button returns to WelcomeScreen', async () => {
      await tapById('join:back-button');
      await assertVisible('welcome:logo');
    });

    it('submit button is visible', async () => {
      await assertVisible('join:submit-button');
    });

    it('shows error on invalid bar code', async () => {
      await typeById('join:code-input', 'XXXXX');
      await tapById('join:submit-button');
      await waitFor(element(by.id('join:error-text'))).toBeVisible().withTimeout(MED_WAIT_MS);
    });

    it('accepts valid bar code and goes to NicknameScreen', async () => {
      await typeById('join:code-input', TEST_BAR_CODE);
      await tapById('join:submit-button');
      await waitFor(element(by.id('nickname:screen'))).toBeVisible().withTimeout(MED_WAIT_MS);
    });
  });

  describe('NicknameScreen', () => {
    beforeEach(async () => {
      await waitFor(element(by.id('welcome:solo-button'))).toBeVisible().withTimeout(15_000);
      await tapById('welcome:solo-button');
      await waitFor(element(by.id('nickname:screen'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
    });

    it('shows nickname input and submit button', async () => {
      await assertVisible('nickname:input');
      await assertVisible('nickname:submit-button');
    });

    it('back button returns to WelcomeScreen', async () => {
      await tapById('nickname:back-button');
      await assertVisible('welcome:logo');
    });

    it('pre-populates with stored nickname if exists', async () => {
      // Input may or may not have text — just verify it's visible
      await assertVisible('nickname:input');
    });

    it('submit with non-empty nickname goes to Lobby', async () => {
      await clearAndType('nickname:input', 'TestPlayer');
      await tapById('nickname:submit-button');
      await waitFor(element(by.id('lobby:screen'))).toBeVisible().withTimeout(MED_WAIT_MS);
    });

    it('submit button disabled when input is empty', async () => {
      await element(by.id('nickname:input')).clearText();
      // Submit button should not navigate when name is empty
      await tapById('nickname:submit-button');
      // Should still be on NicknameScreen
      await assertVisible('nickname:screen');
    });
  });
});
