// tests/helpers/procurement.helpers.js
// Shared helpers for procurement E2E tests.

/**
 * Navigate to a procurement sub-page and wait for it to settle.
 * @param {import('@playwright/test').Page} page
 * @param {string} path  e.g. '' | '/suppliers' | '/orders' | '/payments'
 */
export async function gotoProcurement(page, path = '') {
  await page.goto(`/procurement${path}`);
  // Wait for the top-nav to confirm we are inside the procurement workspace
  await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
}

/**
 * Restore sessionStorage from localStorage entries injected by auth setup.
 * The app's AuthContext reads from sessionStorage; Playwright only restores
 * localStorage via storageState, so we copy the values across.
 * @param {import('@playwright/test').Page} page
 */
export async function restoreSession(page) {
  await page.addInitScript(() => {
    const keys = ['token', 'role', 'userName', 'userId', 'userFirstName',
                  'userLastName', 'userFullName', 'loginTime'];
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, val);
      }
    }
  });
}

/**
 * Assert that a PO number string contains only digits (no PO prefix).
 * @param {string} poNumber
 */
export function assertNumericPONumber(poNumber) {
  if (!poNumber || poNumber.trim() === '' || poNumber === '—') return; // no PO yet
  const cleaned = poNumber.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(
      `PO number "${cleaned}" must be numeric only (no PO/PO-/PO_ prefix)`
    );
  }
}

/**
 * Wait for a toast notification to appear and optionally assert its text.
 * @param {import('@playwright/test').Page} page
 * @param {string} [textContains]
 */
export async function waitForToast(page, textContains) {
  const toast = page.locator('[class*="toast"]').first();
  await toast.waitFor({ state: 'visible', timeout: 8_000 });
  if (textContains) {
    await toast.getByText(textContains, { exact: false }).waitFor({ timeout: 5_000 });
  }
}

/**
 * Generate a unique supplier name for test isolation.
 */
export function uniqueSupplierName() {
  return `Test Supplier ${Date.now()}`;
}
