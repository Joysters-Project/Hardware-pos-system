// tests/inventory/inventory-navigation.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoProducts } from '../helpers/inventory.helpers.js';

let inventory;

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
  inventory = await setupInventoryApi(page);
});

test.afterEach(() => {
  if (inventory) {
    expect(inventory.unexpected, 'Unexpected writes must never reach the real API').toEqual([]);
  }
});

// Controlled API data tests browser behavior and outgoing requests, not backend persistence.
test.describe('Inventory - Navigation', () => {
  test('inventory navigation opens all four pages and survives refresh', async ({ page }) => {
    await gotoProducts(page);
    for (const [label, path, heading] of [
      ['Catalog', '/catalog', 'Catalog Management'],
      ['Batch Inventory', '/inventory/batches', 'Batch Inventory'],
      ['Assets', '/assets', 'Assets'],
      ['Products', '/products', 'Products'],
    ]) {
      const link = page.locator('.procurement-top-nav').getByRole('link', { name: label, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(link).toHaveClass(/active/);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('cell', { name: 'Steel Hammer', exact: true })).toBeVisible();
    expect(inventory.mutations).toEqual([]);
  });
});

test.describe('Inventory - Direct Routes', () => {
  for (const [path, label] of [['/products', 'Products'], ['/catalog', 'Catalog'], ['/assets', 'Assets'], ['/inventory/batches', 'Batch Inventory']]) {
    test(path + ' activates only its own navigation link after reload', async ({ page }) => {
      await page.goto(path);
      const nav = page.locator('.procurement-top-nav');
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveClass(/active/);
      await expect(nav.locator('a.active')).toHaveCount(1);
      await page.reload();
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveClass(/active/);
      await expect(nav.getByRole('link')).toHaveCount(4);
      expect(inventory.mutations).toEqual([]);
    });
  }
});
