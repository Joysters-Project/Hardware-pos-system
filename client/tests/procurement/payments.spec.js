// tests/procurement/payments.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Procurement Payments', () => {

  test('payments page loads', async ({ page }) => {
    await gotoProcurement(page, '/payments');
    await expect(page.locator('.proc-container')).toBeVisible();
  });

  test('no JS errors on payments page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await gotoProcurement(page, '/payments');
    await page.waitForTimeout(2000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('no Refresh button on payments page', async ({ page }) => {
    await gotoProcurement(page, '/payments');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

  test('search input is present on payments page', async ({ page }) => {
    await gotoProcurement(page, '/payments');
    const search = page.getByPlaceholder('Search by supplier or PO number...');
    await expect(search).toBeVisible({ timeout: 8_000 });
  });

  test('PO Number column header is present in payments table', async ({ page }) => {
    await gotoProcurement(page, '/payments');
    const poHeader = page.locator('.proc-table th').getByText('PO Number');
    await expect(poHeader.first()).toBeVisible({ timeout: 8_000 });
  });

  test('loading state resolves on payments page', async ({ page }) => {
    await gotoProcurement(page, '/payments');
    await page.waitForTimeout(3000);
    await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0);
  });

});
