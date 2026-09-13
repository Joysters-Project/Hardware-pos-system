// tests/cashier/due-collection/due.helpers.js
import { expect } from '@playwright/test';
import { loginAsCashier, BASE_URL } from '../billing/billing.helpers.js';

export { loginAsCashier, BASE_URL };

export async function goToDueChecking(page) {
  await page.goto(`${BASE_URL}/cashier-panel/due-collection`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#due-check-search')).toBeVisible({ timeout: 10000 });
}

export async function goToDueCollection(page) {
  await page.goto(`${BASE_URL}/cashier-panel/due-collection/collect`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#due-collection-search')).toBeVisible({ timeout: 10000 });
}

export async function dismissSuccessAnim(page) {
  const successBackdrop = page.locator('.success-backdrop');
  await expect(successBackdrop).toBeVisible({ timeout: 10000 });
  const doneBtn = successBackdrop.locator('button', { hasText: 'Done' });
  await expect(doneBtn).toBeVisible({ timeout: 5000 });
  await doneBtn.click();
  await expect(successBackdrop).not.toBeVisible({ timeout: 5000 });
}
