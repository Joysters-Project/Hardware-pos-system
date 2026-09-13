// tests/cashier/returns/returns.helpers.js
import { expect } from '@playwright/test';
import { loginAsCashier, BASE_URL } from '../billing/billing.helpers.js';

export { loginAsCashier, BASE_URL };

export async function goToProcessReturn(page) {
  await page.goto(`${BASE_URL}/cashier-panel/returns/process`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ret-search-card')).toBeVisible({ timeout: 10000 });
}
