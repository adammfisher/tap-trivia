import { device, element, by, waitFor, expect as detoxExpect } from 'detox';

export const TEST_BAR_CODE = process.env.DETOX_TEST_BAR_CODE || '9CK6T';
export const GAME_WAIT_MS = 16 * 60 * 1000; // 16 min — enough to catch any game window
export const SHORT_WAIT_MS = 10_000;
export const MED_WAIT_MS = 30_000;

/** Tap an element by testID, wait for it to be visible first */
export async function tapById(id: string, waitMs = SHORT_WAIT_MS) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(waitMs);
  await element(by.id(id)).tap();
}

/** Type text into a testID element */
export async function typeById(id: string, text: string) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(SHORT_WAIT_MS);
  await element(by.id(id)).typeText(text);
}

/** Clear then type */
export async function clearAndType(id: string, text: string) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(SHORT_WAIT_MS);
  await element(by.id(id)).clearText();
  await element(by.id(id)).typeText(text);
}

/** Assert element is visible */
export async function assertVisible(id: string, waitMs = SHORT_WAIT_MS) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(waitMs);
}

/** Assert element is not visible */
export async function assertNotVisible(id: string) {
  await detoxExpect(element(by.id(id))).not.toBeVisible();
}

/** Assert element has text */
export async function assertText(id: string, text: string) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(SHORT_WAIT_MS);
  await detoxExpect(element(by.id(id))).toHaveText(text);
}

/** Navigate fresh to WelcomeScreen */
export async function resetToWelcome() {
  await device.reloadReactNative();
  await waitFor(element(by.id('welcome:logo'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
}

/** Navigate to lobby via solo play */
export async function navigateToLobbyViaSolo(nickname = 'TestPlayer') {
  await resetToWelcome();
  await tapById('welcome:solo-button');
  await waitFor(element(by.id('nickname:input'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
  await clearAndType('nickname:input', nickname);
  await tapById('nickname:submit-button');
  await waitFor(element(by.id('lobby:screen'))).toBeVisible().withTimeout(SHORT_WAIT_MS);
}

/** Wait for an active game to start and reach the playing screen */
export async function waitForGameStart() {
  // Navigate to lobby and wait for game to begin
  await waitFor(element(by.id('category:screen'))).toBeVisible().withTimeout(GAME_WAIT_MS);
}
