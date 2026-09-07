// tests/procurement/procurement-overview.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Overview Dashboard', () => {

  test('overview page loads and shows main heading', async ({ page }) => {
    await gotoProcurement(page);
    await expect(page.getByRole('heading', { name: 'Procurement Overview' })).toBeVisible();
  });

  test('KPI stat cards are rendered', async ({ page }) => {
    await gotoProcurement(page);
    // The dashboard renders .pd-kpi cards
    const kpiCards = page.locator('.pd-kpi');
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('no Refresh button exists on overview page', async ({ page }) => {
    await gotoProcurement(page);
    // Assert the manual Refresh button was removed
    const refreshBtn = page.getByRole('button', { name: /^Refresh$/i });
    await expect(refreshBtn).toHaveCount(0);
  });

  test('Create button is present and labelled correctly (not "Create PO")', async ({ page }) => {
    await gotoProcurement(page);
    // Button should say "Create" not "Create PO"
    const createBtn = page.getByRole('button', { name: /^\+?\s*Create$/i });
    await expect(createBtn).toBeVisible();
    // Ensure it does NOT say "Create PO"
    const createPOBtn = page.getByRole('button', { name: /Create PO/i });
    await expect(createPOBtn).toHaveCount(0);
  });

  test('Suppliers nav button is present', async ({ page }) => {
    await gotoProcurement(page);
    await expect(page.getByRole('button', { name: /Suppliers/i })).toBeVisible();
  });

  test('charts section renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await gotoProcurement(page);
    // Wait for charts to attempt render
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('loading state resolves — no perpetual spinner', async ({ page }) => {
    await gotoProcurement(page);
    // After 8 seconds the page should not still show "Loading..."
    await page.waitForTimeout(3000);
    const loadingText = page.getByText('Loading...', { exact: true });
    await expect(loadingText).toHaveCount(0);
  });

});
