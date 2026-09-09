import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoProducts } from '../helpers/inventory.helpers.js';
let inventory;
test.beforeEach(async ({ page }) => {
  await restoreSession(page);
  inventory = await setupInventoryApi(page);
});
test.afterEach(() => {
  expect(inventory.unexpected).toEqual([]);
  expect(inventory.mutations, 'Invalid forms must not send mutations').toEqual([]);
});

test.describe('Products - Required Fields', () => {
  for (const field of ['product_name', 'type', 'unit_price', 'cost_price', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'category_id', 'unit_id']) {
    test(field + ' is required when editing', async ({ page }) => {
      await gotoProducts(page);
      await page.getByTitle('Edit', { exact: true }).click();
      const modal = page.locator('.edit-product-modal');
      const input = modal.locator('[name="' + field + '"]');
      if (field.endsWith('_id')) await input.selectOption('');
      else await input.fill(field === 'product_name' || field === 'type' ? '   ' : '');
      await modal.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText('Please fill all required fields.')).toBeVisible();
      await expect(modal).toBeVisible();
    });
  }
});
test.describe('Products - Numeric Validation', () => {
  for (const field of ['unit_price', 'cost_price', 'stock_quantity', 'min_stock_quantity', 'reorder_level']) {
    test(field + ' cannot be negative when editing', async ({ page }) => {
      await gotoProducts(page);
      await page.getByTitle('Edit', { exact: true }).click();
      const modal = page.locator('.edit-product-modal');
      const input = modal.locator('[name="' + field + '"]');
      await input.fill('-1');
      await modal.getByRole('button', { name: 'Save Changes' }).click();
      await expect.poll(() => input.evaluate(el => el.validity.rangeUnderflow)).toBe(true);
      await expect(modal).toBeVisible();
    });
  }
  test('alternative unit requires a positive conversion factor', async ({ page }) => {
    await gotoProducts(page);
    await page.getByTitle('Edit', { exact: true }).click();
    const modal = page.locator('.edit-product-modal');
    await modal.getByRole('button', { name: 'Add Alternative Unit' }).click();
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Each alternative unit needs a unit and a positive conversion factor.')).toBeVisible();
  });
});
