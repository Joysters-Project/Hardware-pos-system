// tests/inventory/products.spec.js
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
test.describe('Products - Create and Edit', () => {
  test('products search, required validation, and edit persistence', async ({ page }) => {
    await gotoProducts(page);
    await page.getByPlaceholder('Search by ID, name, type, batch, or barcode…').fill('missing');
    await expect(page.locator('tbody')).toContainText('No products');
    await page.locator('#search').fill('hammer');
    await page.getByTitle('Edit', { exact: true }).click();
    const modal = page.locator('.edit-product-modal');
    await modal.locator('[name="product_name"]').fill('');
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Please fill all required fields.')).toBeVisible();
    expect(inventory.mutations).toEqual([]);
    await modal.locator('[name="product_name"]').fill('Heavy Hammer');
    await modal.locator('[name="unit_price"]').fill('950');
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(modal).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('cell', { name: 'Heavy Hammer', exact: true })).toBeVisible();
    expect(inventory.mutations[0]).toMatchObject({ method: 'PUT', resource: 'products', body: { product_name: 'Heavy Hammer', unit_price: 950 } });
  });

  test('products create from the form and remain visible after reload', async ({ page }) => {
    await gotoProducts(page);
    await page.getByRole('button', { name: 'Add Product', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();
    const form = page.locator('.add-product-container form');
    await form.getByRole('button', { name: 'Add Product', exact: true }).click();
    await expect(page.getByText('Please fill all required fields.')).toBeVisible();
    expect(inventory.mutations).toEqual([]);
    for (const [name, value] of Object.entries({ product_name: 'Claw Hammer', type: 'Tool', unit_price: '1200', cost_price: '800', stock_quantity: '20', min_stock_quantity: '2', reorder_level: '5' })) {
      await form.locator(`[name="${name}"]`).fill(value);
    }
    await form.locator('[name="category_id"]').selectOption('1');
    await form.locator('[name="unit_id"]').selectOption('1');
    await form.getByRole('button', { name: 'Add Product', exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('row').filter({ hasText: 'Claw Hammer' })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('row').filter({ hasText: 'Claw Hammer' }).getByRole('cell', { name: 'Rs. 1200.00', exact: true })).toBeVisible();
    expect(inventory.mutations).toHaveLength(1);
    expect(inventory.mutations[0]).toMatchObject({ method: 'POST', resource: 'products', body: { product_name: 'Claw Hammer', unit_price: 1200, cost_price: 800, stock_quantity: 20, category_id: 1, unit_id: 1 } });
  });
});


test.describe('Products - Details and Error Handling', () => {
  test('details show product and batch information', async ({ page }) => {
    await gotoProducts(page);
    await page.getByTitle('View', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Product Details' })).toBeVisible();
    await expect(page.locator('.view-modal')).toContainText('Steel Hammer');
    await expect(page.locator('.view-modal')).toContainText('BATCH-1');
  });
  test('delete cancellation preserves the product', async ({ page }) => {
    await gotoProducts(page);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByTitle('Delete', { exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Steel Hammer', exact: true })).toBeVisible();
    expect(inventory.mutations).toEqual([]);
  });
  test('failed edit retains form values', async ({ page }) => {
    await page.route('**/api/products/1', route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, json: { error: 'Save unavailable' } }) : route.fallback());
    await gotoProducts(page);
    await page.getByTitle('Edit', { exact: true }).click();
    const modal = page.locator('.edit-product-modal');
    await modal.locator('[name="product_name"]').fill('Changed Hammer');
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Save unavailable', { exact: true })).toBeVisible();
    await expect(modal.locator('[name="product_name"]')).toHaveValue('Changed Hammer');
    expect(inventory.mutations).toEqual([]);
  });
  test('list API failure shows an error', async ({ page }) => {
    await page.route('**/api/products', route => route.fulfill({ status: 500, json: {} }));
    await gotoProducts(page);
    await expect(page.getByText('Failed to load products', { exact: true })).toBeVisible();
  });
});

test.describe('Products - Search, Cancellation and Delete', () => {
  for (const query of ['STEEL', 'Tool', 'SCAN123', 'LOTABC']) {
    test('search finds product by ' + query, async ({ page }) => {
      Object.assign(inventory.data.products[0], { barcode: 'SCAN123', batch_no: 'LOTABC' });
      await gotoProducts(page);
      await page.locator('#search').fill(query);
      await expect(page.getByRole('cell', { name: 'Steel Hammer', exact: true })).toBeVisible();
      expect(inventory.mutations).toEqual([]);
    });
  }
  test('cancel edit discards changed values', async ({ page }) => {
    await gotoProducts(page);
    await page.getByTitle('Edit', { exact: true }).click();
    const modal = page.locator('.edit-product-modal');
    await modal.locator('[name="product_name"]').fill('Discarded');
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByTitle('Edit', { exact: true }).click();
    await expect(modal.locator('[name="product_name"]')).toHaveValue('Steel Hammer');
    expect(inventory.mutations).toEqual([]);
  });
  test('confirmed deletion persists after reload', async ({ page }) => {
    await gotoProducts(page);
    page.once('dialog', dialog => dialog.accept());
    await page.getByTitle('Delete', { exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Steel Hammer', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('tbody')).toContainText('No products');
    expect(inventory.mutations[0]).toMatchObject({ resource: 'products', id: '1', method: 'DELETE' });
  });
});
