// tests/procurement/forecast.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Forecast', () => {

  test('forecast page loads', async ({ page }) => {
    await gotoProcurement(page, '/forecast');
    await expect(page.locator('.proc-container')).toBeVisible();
  });

  test('no JS errors on forecast page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await gotoProcurement(page, '/forecast');
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('no Refresh button on forecast page', async ({ page }) => {
    await gotoProcurement(page, '/forecast');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

  test('loading state resolves on forecast page', async ({ page }) => {
    await gotoProcurement(page, '/forecast');
    await page.waitForTimeout(3000);
    await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0);
  });

});
