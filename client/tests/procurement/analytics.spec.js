// tests/procurement/analytics.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Analytics', () => {

  test('analytics page loads with heading', async ({ page }) => {
    await gotoProcurement(page, '/analytics');
    await expect(page.getByRole('heading', { name: 'Procurement Analytics' })).toBeVisible();
  });

  test('KPI cards are rendered', async ({ page }) => {
    await gotoProcurement(page, '/analytics');
    const kpiCards = page.locator('.pp-kpi-card');
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });
    expect(await kpiCards.count()).toBeGreaterThanOrEqual(4);
  });

  test('no Refresh button on analytics page', async ({ page }) => {
    await gotoProcurement(page, '/analytics');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

  test('chart sections are present', async ({ page }) => {
    await gotoProcurement(page, '/analytics');
    await expect(page.getByText('Monthly Purchase Volume')).toBeVisible();
    await expect(page.getByText('PO Status Distribution')).toBeVisible();
    await expect(page.getByText('Top Suppliers by Spend')).toBeVisible();
    await expect(page.getByText('Supplier On-Time Delivery %')).toBeVisible();
  });

  test('purchase summary table is present', async ({ page }) => {
    await gotoProcurement(page, '/analytics');
    await expect(page.getByText('Purchase Summary by Supplier')).toBeVisible();
  });

  test('no JS page errors on analytics', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await gotoProcurement(page, '/analytics');
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

});
