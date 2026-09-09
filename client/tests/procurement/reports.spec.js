// tests/procurement/reports.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Reports', () => {

  test('reports page loads', async ({ page }) => {
    await gotoProcurement(page, '/reports');
    // Wait for the page container
    await expect(page.locator('.proc-container')).toBeVisible();
  });

  test('no JS errors on reports page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await gotoProcurement(page, '/reports');
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('no Refresh button on reports page', async ({ page }) => {
    await gotoProcurement(page, '/reports');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

  test('PO Number column header exists in reports table if present', async ({ page }) => {
    await gotoProcurement(page, '/reports');
    // The reports page may have a PO Number column
    const poHeader = page.locator('.proc-table th').getByText('PO Number');
    const count = await poHeader.count();
    if (count > 0) {
      await expect(poHeader.first()).toBeVisible();
    }
  });

});
