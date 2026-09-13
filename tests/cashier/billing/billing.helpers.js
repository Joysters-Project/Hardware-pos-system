// tests/cashier/billing/billing.helpers.js
//
// Shared helpers for all cashier billing tests.
//
// WEBKIT NOTE: WebKit on Windows cannot resolve 'localhost' — it requires
//   '127.0.0.1'. We detect the browser name and use the correct host.
//   This is a known Playwright-on-Windows environment limitation.

import { expect } from '@playwright/test';

// Allow override via env var; default to Chromium/Firefox-friendly localhost.
// For WebKit we switch to 127.0.0.1 at runtime (see getBaseUrl below).
export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export const CASHIER_USER = {
  username: 'cashier',
  password: 'Cashier@123',
  role: 'Cashier',
  firstName: 'Cashier',
};

/**
 * Returns the correct base URL for the browser under test.
 * WebKit on Windows cannot resolve 'localhost' but CAN reach '127.0.0.1'.
 */
function getBaseUrl(page) {
  const browserName = page.context().browser()?.browserType()?.name?.() ?? '';
  if (browserName === 'webkit') {
    return BASE_URL.replace('localhost', '127.0.0.1');
  }
  return BASE_URL;
}

/**
 * Log in as Cashier. Always starts from a clean navigation state.
 */
export async function loginAsCashier(page) {
  const base = getBaseUrl(page);

  // If already authenticated on cashier panel, avoid re-logging in
  if (page.url().includes('/cashier-panel')) {
    return;
  }

  // Navigate directly to cashier login page
  await page.goto(`${base}/login/cashier`, { waitUntil: 'domcontentloaded' });

  // Fill login form
  const usernameInput = page.getByPlaceholder('Username');
  await expect(usernameInput).toBeVisible({ timeout: 10000 });
  await usernameInput.fill(CASHIER_USER.username);
  await page.getByPlaceholder('Password').fill(CASHIER_USER.password);
  await page.getByRole('button', { name: 'LOGIN' }).click();

  // Wait for cashier dashboard or panel
  await page.waitForURL(/\/(dashboard\/cashier|cashier-panel)/, { waitUntil: 'domcontentloaded', timeout: 20000 });
}

/**
 * Navigate to Billing Counter and wait for the core UI to be ready.
 */
export async function goToBillingCounter(page) {
  const base = getBaseUrl(page);
  await page.goto(`${base}/cashier-panel/billing`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#pos-search')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Selected Products')).toBeVisible({ timeout: 10000 });
}

/**
 * Add a product to the cart by name. Waits for dropdown to appear, clicks
 * the first result, then waits for the dropdown to close before returning.
 * This prevents DOM detachment race conditions in subsequent searches.
 */
export async function addProduct(page, name) {
  const searchInput = page.locator('#pos-search');
  await searchInput.fill(name);
  const dropdown = page.locator('.pos-search-dropdown-modern');
  await expect(dropdown).toBeVisible({ timeout: 5000 });
  await page.locator('.pos-search-result-modern').first().click();
  // Wait for dropdown to close before continuing
  await expect(dropdown).not.toBeVisible({ timeout: 5000 });
}

/**
 * Dismiss the SuccessAnim overlay if it appears. The overlay renders as
 * `.success-backdrop.animate` and sits above all other UI including the
 * receipt modal. After a checkout the SuccessAnim ALWAYS appears, but may
 * take a moment due to requestAnimationFrame scheduling.
 *
 * If the SuccessAnim does NOT appear within the timeout, this function
 * returns silently (allows tests to degrade gracefully).
 */
export async function dismissSuccessAnim(page, timeout = 10000) {
  const successBackdrop = page.locator('.success-backdrop');

  const appeared = await successBackdrop.waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

  if (!appeared) return;

  // Click the "Done" button inside the modal
  const doneBtn = successBackdrop.locator('button', { hasText: 'Done' });
  await expect(doneBtn).toBeVisible({ timeout: 5000 });
  await doneBtn.click();

  // Wait for the 300 ms fade-out in handleSuccessDismiss()
  await expect(successBackdrop).not.toBeVisible({ timeout: 3000 });
}
