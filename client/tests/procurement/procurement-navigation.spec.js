// tests/procurement/procurement-navigation.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Navigation', () => {

  test('procurement workspace loads with top-nav', async ({ page }) => {
    await gotoProcurement(page);
    await expect(page.locator('.procurement-top-nav')).toBeVisible();
    await expect(page.locator('.procurement-title-block h1')).toHaveText('Procurement');
  });

  test('Overview nav link is active on /procurement', async ({ page }) => {
    await gotoProcurement(page);
    const overviewLink = page.locator('.procurement-nav-item.active');
    await expect(overviewLink).toContainText('Overview');
  });

  test('navigates to Suppliers page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Suppliers' }).click();
    await expect(page).toHaveURL(/\/procurement\/suppliers/);
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
  });

  test('navigates to Purchase Orders page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Purchase Orders' }).click();
    await expect(page).toHaveURL(/\/procurement\/orders/);
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  });

  test('navigates to Payments page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Payments' }).click();
    await expect(page).toHaveURL(/\/procurement\/payments/);
  });

  test('navigates to Analytics page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/procurement\/analytics/);
    await expect(page.getByRole('heading', { name: 'Procurement Analytics' })).toBeVisible();
  });

  test('navigates to Forecast page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Forecast' }).click();
    await expect(page).toHaveURL(/\/procurement\/forecast/);
  });

  test('navigates to Reports page', async ({ page }) => {
    await gotoProcurement(page);
    // Scope to procurement nav to avoid matching the sidebar Reports link
    await page.locator('.procurement-top-nav').getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/procurement\/reports/);
  });

  test('navigates to Notifications page', async ({ page }) => {
    await gotoProcurement(page);
    await page.getByRole('link', { name: 'Notifications' }).click();
    await expect(page).toHaveURL(/\/procurement\/notifications/);
  });

  test('no unexpected error banners on any procurement page', async ({ page }) => {
    const routes = ['', '/suppliers', '/orders', '/payments', '/analytics', '/forecast', '/reports'];
    for (const route of routes) {
      await gotoProcurement(page, route);
      // The app uses .proc-error-banner for inline errors
      const errorBanner = page.locator('.proc-error-banner');
      await expect(errorBanner).toHaveCount(0);
    }
  });

});
