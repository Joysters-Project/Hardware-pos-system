// tests/inventory/batch-inventory.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoBatchInventory } from '../helpers/inventory.helpers.js';

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
test.describe('Batch Inventory - Disposal and API Errors', () => {
  test('batch details and disposal are limited to expired batches', async ({ page }) => {
    await gotoBatchInventory(page);
    const active = page.getByRole('row').filter({ hasText: 'BATCH-1' });
    const expired = page.getByRole('row').filter({ hasText: 'BATCH-2' });
    await expect(active.getByTitle('Dispose')).toHaveCount(0);
    await expired.getByTitle('View', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Batch Details' })).toBeVisible();
    await expect(page.locator('.view-modal')).toContainText('Tool Supplier');
    await page.locator('.view-modal .modal-close').click();
    page.once('dialog', dialog => dialog.dismiss());
    await expired.getByTitle('Dispose').click();
    expect(inventory.mutations).toEqual([]);
    page.once('dialog', dialog => dialog.accept());
    await expired.getByTitle('Dispose').click();
    await expect(expired).toContainText('Disposed');
    await expect(expired.getByTitle('Dispose')).toHaveCount(0);
    expect(inventory.mutations[0]).toMatchObject({ method: 'POST', resource: 'batch-inventory', id: '2', action: 'dispose' });
  });

  test('failed batch disposal preserves status and remaining quantity', async ({ page }) => {
    const attempts = [];
    await page.route('**/api/batch-inventory/2/dispose', route => {
      attempts.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: 'Disposal unavailable. Try again.' } });
    });
    await gotoBatchInventory(page);
    const row = page.getByRole('row').filter({ hasText: 'BATCH-2' });
    page.once('dialog', dialog => dialog.accept());
    await row.getByTitle('Dispose').click();
    await expect(page.getByText('Disposal unavailable. Try again.', { exact: true })).toBeVisible();
    await expect(row).toContainText('Expired');
    await expect(row.locator('.stock-badge')).toHaveText('4');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(row).toContainText('Expired');
    await expect(row.locator('.stock-badge')).toHaveText('4');
    await expect(row.getByTitle('Dispose')).toBeVisible();
    expect(attempts).toEqual(['POST']);
    expect(inventory.mutations).toEqual([]);
  });

  test('batch API failure shows an error and refresh recovers', async ({ page }) => {
    await page.route('**/api/batch-inventory', route => route.fulfill({ status: 500, json: { error: 'Unavailable' } }), { times: 1 });
    await gotoBatchInventory(page);
    await expect(page.getByText('Failed to load batch inventory', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: 'BATCH-1' })).toBeVisible();
    expect(inventory.mutations).toEqual([]);
  });
});


test.describe('Batch Inventory - Search and Empty State', () => {
  for (const query of ['BATCH-2', 'Steel Hammer', 'Tool Supplier', '21', 'Expired']) {
    test('search matches ' + query, async ({ page }) => {
      await gotoBatchInventory(page);
      await expect(page.locator('tbody tr')).toHaveCount(2);
      await page.locator('#search').fill(query);
      await expect(page.locator('tbody tr')).toHaveCount(['BATCH-2', 'Expired'].includes(query) ? 1 : 2);
      await expect(page.locator('tbody')).toContainText('BATCH-2');
    });
  }
  test('unmatched search shows empty state and clearing restores rows', async ({ page }) => {
    await gotoBatchInventory(page);
    await page.locator('#search').fill('no-such-batch');
    await expect(page.getByText('No batches found.', { exact: true })).toBeVisible();
    await page.locator('#search').fill('');
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });
});
