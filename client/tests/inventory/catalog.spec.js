// tests/inventory/catalog.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoCatalog } from '../helpers/inventory.helpers.js';

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
test.describe('Catalog - CRUD, Validation and Search', () => {
  test('catalog validates names and creates, edits, and deletes a category', async ({ page }) => {
    await gotoCatalog(page);
    await expect(page.getByRole('button', { name: 'Add Item' })).toBeDisabled();
    await page.locator('#name').fill('Fasteners123!');
    await expect(page.locator('#name')).toHaveValue('Fasteners');
    await page.getByRole('button', { name: 'Add Item' }).click();
    const card = page.locator('.catalog-card-row').filter({ hasText: 'Fasteners' });
    await card.getByTitle('Edit Item').click();
    await page.locator('#editingName').fill('Fixings');
    await page.getByTitle('Save Changes').click();
    await expect(page.locator('.card-item-name').filter({ hasText: /^Fixings$/ })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.catalog-card-row').filter({ hasText: 'Fixings' }).getByTitle('Delete Item').click();
    await expect(page.locator('.catalog-card-row').filter({ hasText: 'Fixings' })).toHaveCount(0);
    expect(inventory.mutations.map(m => m.method)).toEqual(['POST', 'PATCH', 'DELETE']);
    expect(inventory.mutations[0].body).toEqual({ category_name: 'Fasteners' });
  });

  test('catalog tabs load their own records and search filters results', async ({ page }) => {
    await gotoCatalog(page);
    for (const [tab, name] of [['Categories', 'Tools'], ['Brands', 'Acme'], ['Units', 'Piece']]) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.locator('.card-item-name')).toHaveText(name);
      await page.locator('#searchQuery').fill('Missing');
      await expect(page.getByText('No matching items found. Create one to begin!')).toBeVisible();
    }
    expect(inventory.mutations).toEqual([]);
  });

  test('catalog keeps linked categories when the API rejects deletion', async ({ page }) => {
    const attempts = [];
    await page.route('**/api/category/1', route => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      attempts.push(route.request().method());
      return route.fulfill({ status: 400, json: { linkedProductCount: 1 } });
    });
    await gotoCatalog(page);
    const card = page.locator('.catalog-card-row').filter({ hasText: 'Tools' });
    page.once('dialog', dialog => dialog.accept());
    await card.getByTitle('Delete Item').click();
    await expect(page.getByText(/Cannot delete: 1 product\(s\) linked to this category/)).toBeVisible();
    await expect(card).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(card).toBeVisible();
    expect(attempts).toEqual(['DELETE']);
    expect(inventory.mutations).toEqual([]);
  });
});


test.describe('Catalog - Pagination and Editing', () => {
  test('pagination and page size show the correct number of records', async ({ page }) => {
    inventory.data.category = Array.from({ length: 21 }, (_, i) => ({ category_id: i + 1, category_name: 'Category ' + String.fromCharCode(65 + i) }));
    await gotoCatalog(page);
    await expect(page.locator('.catalog-card-row')).toHaveCount(10);
    await page.locator('.page-nav-btn').last().click();
    await expect(page.locator('.current-page-num')).toHaveText('2 / 3');
    await page.locator('#pageSize').selectOption('50');
    await expect(page.locator('.catalog-card-row')).toHaveCount(21);
    await expect(page.locator('.current-page-num')).toHaveText('1 / 1');
  });
  test('switching tabs clears an unfinished edit', async ({ page }) => {
    await gotoCatalog(page);
    await page.getByTitle('Edit Item').click();
    await page.locator('#editingName').fill('Unsaved Category');
    await page.getByRole('button', { name: 'Brands', exact: true }).click();
    await expect(page.locator('.card-item-name')).toHaveText('Acme');
    await expect(page.locator('#editingName')).toHaveCount(0);
    expect(inventory.mutations).toEqual([]);
  });
  test('Escape cancels an inline edit', async ({ page }) => {
    await gotoCatalog(page);
    await page.getByTitle('Edit Item').click();
    await page.locator('#editingName').fill('Discarded');
    await page.locator('#editingName').press('Escape');
    await expect(page.locator('.card-item-name')).toHaveText('Tools');
    expect(inventory.mutations).toEqual([]);
  });
  test('name input enforces the 50 character boundary', async ({ page }) => {
    await gotoCatalog(page);
    await page.locator('#name').fill('A'.repeat(51));
    await expect(page.locator('#name')).toHaveValue('A'.repeat(50));
    await expect(page.locator('.catalog-char-counter').first()).toHaveText('50/50');
  });
});

test.describe('Catalog - Brand and Unit Lifecycle', () => {
  for (const [tab, resource, field] of [['Brands', 'brands', 'brand_name'], ['Units', 'units', 'unit_name']]) {
    test(tab + ' create, rename and delete persist after reload', async ({ page }) => {
      await gotoCatalog(page);
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.locator('#name').fill('New Item');
      await page.getByRole('button', { name: 'Add Item' }).click();
      await page.locator('.catalog-card-row').filter({ hasText: 'New Item' }).getByTitle('Edit Item').click();
      await page.locator('#editingName').fill('Renamed Item');
      await page.getByTitle('Save Changes').click();
      await expect(page.locator('.card-item-name').filter({ hasText: 'Renamed Item' })).toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: tab, exact: true }).click();
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.catalog-card-row').filter({ hasText: 'Renamed Item' }).getByTitle('Delete Item').click();
      await expect(page.locator('.card-item-name').filter({ hasText: 'Renamed Item' })).toHaveCount(0);
      expect(inventory.mutations.map(m => m.method)).toEqual(['POST', 'PATCH', 'DELETE']);
      expect(inventory.mutations[0]).toMatchObject({ resource, body: { [field]: 'New Item' } });
    });
    test(tab + ' delete cancellation preserves item', async ({ page }) => {
      await gotoCatalog(page);
      await page.getByRole('button', { name: tab, exact: true }).click();
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByTitle('Delete Item').click();
      await expect(page.locator('.catalog-card-row')).toHaveCount(1);
      expect(inventory.mutations).toEqual([]);
    });
  }
});
