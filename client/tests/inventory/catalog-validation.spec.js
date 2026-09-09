import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoCatalog } from '../helpers/inventory.helpers.js';
let inventory;
test.beforeEach(async ({ page }) => {
  await restoreSession(page);
  inventory = await setupInventoryApi(page);
});
test.afterEach(() => {
  expect(inventory.unexpected).toEqual([]);
  expect(inventory.mutations, 'Invalid forms must not send mutations').toEqual([]);
});

test.describe('Catalog - Name Validation', () => {
  for (const tab of ['Categories', 'Brands', 'Units']) {
    test(tab + ' rejects blank names and sanitizes symbols', async ({ page }) => {
      await gotoCatalog(page);
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.locator('#name').fill('   ');
      await expect(page.getByRole('button', { name: 'Add Item' })).toBeDisabled();
      await page.locator('#name').fill('123!');
      await expect(page.locator('#name')).toHaveValue('');
      await expect(page.getByRole('button', { name: 'Add Item' })).toBeDisabled();
      await page.getByTitle('Edit Item').click();
      await page.locator('#editingName').fill('   ');
      await page.getByTitle('Save Changes').click();
      await expect(page.getByText('Name is required', { exact: true })).toBeVisible();
    });
  }
  test('duplicate category error preserves entered name', async ({ page }) => {
    const attempts = [];
    await page.route('**/api/category', route => {
      if (route.request().method() !== 'POST') return route.fallback();
      attempts.push(route.request().postDataJSON());
      return route.fulfill({ status: 409, json: { message: 'Name already exists' } });
    });
    await gotoCatalog(page);
    await page.locator('#name').fill('Tools');
    await page.getByRole('button', { name: 'Add Item' }).click();
    await expect(page.getByText('Name already exists', { exact: true })).toBeVisible();
    await expect(page.locator('#name')).toHaveValue('Tools');
    expect(attempts).toEqual([{ category_name: 'Tools' }]);
    await expect(page.locator('.catalog-card-row')).toHaveCount(1);
  });
});

test.describe('Catalog - Edit Validation', () => {
  for (const tab of ['Categories', 'Brands', 'Units']) {
    test(tab + ' inline edit sanitizes symbols and limits length', async ({ page }) => {
      await gotoCatalog(page);
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.getByTitle('Edit Item').click();
      await page.locator('#editingName').fill('123!');
      await expect(page.locator('#editingName')).toHaveValue('');
      await page.locator('#editingName').fill('A'.repeat(51));
      await expect(page.locator('#editingName')).toHaveValue('A'.repeat(50));
      await page.locator('#editingName').press('Escape');
      await expect(page.locator('#editingName')).toHaveCount(0);
    });
  }
});
