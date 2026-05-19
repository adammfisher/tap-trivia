import { device, element, by, waitFor } from 'detox';
import { tapById, clearAndType, assertVisible, resetToWelcome, SHORT_WAIT_MS, MED_WAIT_MS } from './helpers';

describe('Create Group', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  beforeEach(async () => {
    await resetToWelcome();
    await waitFor(element(by.id('welcome:create-group-button'))).toBeVisible().withTimeout(15_000);
    await tapById('welcome:create-group-button');
    await assertVisible('create-group:screen');
  });

  it('shows group name input and submit button', async () => {
    await assertVisible('create-group:name-input');
    await assertVisible('create-group:submit-button');
  });

  it('back button returns to WelcomeScreen', async () => {
    await tapById('create-group:back-button');
    await assertVisible('welcome:logo');
  });

  it('cannot create group with empty name', async () => {
    await element(by.id('create-group:name-input')).clearText();
    await tapById('create-group:submit-button');
    await assertVisible('create-group:screen');
  });

  it('cannot create group with name that is too short', async () => {
    await clearAndType('create-group:name-input', 'A');
    await tapById('create-group:submit-button');
    // Should remain on create-group screen (min 2 chars)
    await assertVisible('create-group:screen');
  });

  it('creates a group and shows the group code', async () => {
    await clearAndType('create-group:name-input', 'E2E Test Group');
    await tapById('create-group:submit-button');
    await waitFor(element(by.id('create-group:code-display'))).toBeVisible().withTimeout(MED_WAIT_MS);
  });

  it('group code is displayed after creation', async () => {
    await clearAndType('create-group:name-input', 'My Test Group');
    await tapById('create-group:submit-button');
    await waitFor(element(by.id('create-group:code-display'))).toBeVisible().withTimeout(MED_WAIT_MS);
    await assertVisible('create-group:code-display');
  });

  it('back button visible in success state', async () => {
    await clearAndType('create-group:name-input', 'Another Test Group');
    await tapById('create-group:submit-button');
    await waitFor(element(by.id('create-group:code-display'))).toBeVisible().withTimeout(MED_WAIT_MS);
    // Back button should be visible in the success state
    await assertVisible('create-group:back-button');
  });
});
