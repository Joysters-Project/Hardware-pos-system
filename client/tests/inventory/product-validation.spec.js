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

test.describe('Products - Add Form Validation', () => {
  for (const field of ['product_name', 'type', 'unit_price', 'cost_price', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'category_id', 'unit_id']) {
    test(field + ' is required when creating', async ({ page }) => {
      await gotoProducts(page);
      await page.getByRole('button', { name: 'Add Product', exact: true }).click();
      const form = page.locator('.add-product-container form');
      for (const [name, value] of Object.entries({ product_name: 'New Hammer', type: 'Tool', unit_price: '900', cost_price: '600', stock_quantity: '10', min_stock_quantity: '2', reorder_level: '3' })) {
        await form.locator(`[name="${name}"]`).fill(value);
      }
      await form.locator('[name="category_id"]').selectOption('1');
      await form.locator('[name="unit_id"]').selectOption('1');
      const input = form.locator(`[name="${field}"]`);
      if (field.endsWith('_id')) await input.selectOption('');
      else await input.fill('');
      await form.getByRole('button', { name: 'Add Product', exact: true }).click();
      await expect(page.getByText('Please fill all required fields.', { exact: true })).toBeVisible();
      await expect(form).toBeVisible();
    });
  }
});

test.describe('Products - Decimal Precision', () => {
  for (const [field, value] of [['unit_price', '1.001'], ['cost_price', '1.001'], ['stock_quantity', '1.5'], ['min_stock_quantity', '1.5'], ['reorder_level', '1.5']]) {
    test(field + ' rejects unsupported precision', async ({ page }) => {
      await gotoProducts(page);
      await page.getByTitle('Edit', { exact: true }).click();
      const modal = page.locator('.edit-product-modal');
      const input = modal.locator(`[name="${field}"]`);
      await input.fill(value);
      await modal.getByRole('button', { name: 'Save Changes' }).click();
      expect(await input.evaluate(el => el.validity.stepMismatch)).toBe(true);
      await expect(modal).toBeVisible();
    });
  }
});
