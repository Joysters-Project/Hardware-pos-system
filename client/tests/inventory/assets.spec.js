// tests/inventory/assets.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoAssets } from '../helpers/inventory.helpers.js';

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
test.describe('Assets - Budget and Lifecycle', () => {
  test('assets enforce department budget before creating an asset', async ({ page }) => {
    await gotoAssets(page);
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
    const modal = page.locator('.proc-modal');
    await modal.locator('#asset_name').fill('Bench Grinder');
    await modal.locator('select').first().selectOption('1');
    await modal.locator('#purchase_date').fill('2025-02-01');
    await modal.locator('#cost').fill('10001');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Asset cost exceeds the remaining budget for Workshop.')).toBeVisible();
    expect(inventory.mutations).toEqual([]);
    await modal.locator('#cost').fill('3000');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(modal).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('cell', { name: 'Bench Grinder', exact: true })).toBeVisible();
    expect(inventory.mutations[0]).toMatchObject({ method: 'POST', resource: 'assets', body: { asset_name: 'Bench Grinder', department_id: '1', cost: '3000', add_as_expense: false } });
  });

  test('assets must be disposed before deletion', async ({ page }) => {
    await gotoAssets(page);
    const row = page.getByRole('row').filter({ hasText: 'Workshop Drill' });
    await expect(row.getByTitle('Delete')).toHaveCount(0);
    page.once('dialog', dialog => dialog.dismiss());
    await row.getByTitle('Dispose').click();
    expect(inventory.mutations).toEqual([]);
    page.once('dialog', dialog => dialog.accept());
    await row.getByTitle('Dispose').click();
    await expect(row).toContainText('Disposed');
    page.once('dialog', dialog => dialog.accept());
    await row.getByTitle('Delete').click();
    await expect(row).toHaveCount(0);
    expect(inventory.mutations.map(m => m.method)).toEqual(['PATCH', 'DELETE']);
  });

  test('assets edit existing values and preserve the update after reload', async ({ page }) => {
    await gotoAssets(page);
    await page.getByRole('row').filter({ hasText: 'Workshop Drill' }).getByTitle('Edit').click();
    const modal = page.locator('.proc-modal');
    await expect(modal.locator('#asset_name')).toHaveValue('Workshop Drill');
    await expect(modal.locator('#cost')).toHaveValue('2000');
    await modal.locator('#asset_name').fill('Workshop Impact Drill');
    await modal.locator('#cost').fill('2500');
    await modal.locator('#status').selectOption('Maintenance');
    await modal.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(modal).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row').filter({ hasText: 'Workshop Impact Drill' });
    await expect(row).toContainText('Maintenance');
    await expect(row).toContainText('2,500');
    expect(inventory.mutations).toHaveLength(1);
    expect(inventory.mutations[0]).toMatchObject({ method: 'PUT', resource: 'assets', id: '1', body: { asset_name: 'Workshop Impact Drill', cost: '2500', status: 'Maintenance' } });
  });
});


test.describe('Assets - Search, Details and Pagination', () => {
  test('search and status filters combine', async ({ page }) => {
    inventory.data.assets.push({ ...inventory.data.assets[0], asset_id: 2, asset_name: 'Spare Drill', status: 'Maintenance' });
    await gotoAssets(page);
    await page.locator('#search').fill('drill');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.locator('#filterStatus').selectOption('Maintenance');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('Spare Drill');
  });
  test('department filter excludes other departments', async ({ page }) => {
    inventory.data.departments.push({ department_id: 2, department_name: 'Office', status: 'Active' });
    inventory.data.assets.push({ ...inventory.data.assets[0], asset_id: 2, asset_name: 'Office Printer', department_id: 2 });
    await gotoAssets(page);
    await page.locator('#filterDept').selectOption('2');
    await expect(page.locator('tbody')).toContainText('Office Printer');
    await expect(page.locator('tbody')).not.toContainText('Workshop Drill');
  });
  test('details show name, cost and department', async ({ page }) => {
    await gotoAssets(page);
    await page.getByTitle('View', { exact: true }).click();
    const modal = page.locator('.proc-modal');
    await expect(modal).toContainText('Workshop Drill');
    await expect(modal).toContainText('LKR 2,000');
    await expect(modal).toContainText('Workshop');
    await modal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal).toBeHidden();
  });
  test('cancel clears the add form', async ({ page }) => {
    await gotoAssets(page);
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
    await page.locator('#asset_name').fill('Discarded');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
    await expect(page.locator('#asset_name')).toHaveValue('');
    expect(inventory.mutations).toEqual([]);
  });
  test('deleting the only record on the last page returns to valid page', async ({ page }) => {
    inventory.data.assets = Array.from({ length: 11 }, (_, i) => ({ ...inventory.data.assets[0], asset_id: i + 1, asset_name: 'Equipment ' + i, status: 'Disposed' }));
    await gotoAssets(page);
    await page.locator('.proc-pagination').getByRole('button', { name: '2', exact: true }).click();
    await expect(page.locator('tbody')).toContainText('Equipment 10');
    page.once('dialog', dialog => dialog.accept());
    await page.getByTitle('Delete', { exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.locator('tbody')).toContainText('Equipment 0');
  });
  test('list API failure shows a message', async ({ page }) => {
    await page.route('**/api/assets', route => route.fulfill({ status: 500, json: {} }));
    await gotoAssets(page);
    await expect(page.getByText('Failed to load assets', { exact: true })).toBeVisible();
  });
});

test.describe('Assets - Failure Recovery and Empty State', () => {
  test('empty dataset shows no assets and hides pagination', async ({ page }) => {
    inventory.data.assets = [];
    await gotoAssets(page);
    await expect(page.locator('tbody')).toContainText('No assets found');
    await expect(page.locator('.proc-pagination')).toHaveCount(0);
  });
  test('failed edit keeps entered values and stored asset unchanged', async ({ page }) => {
    await page.route('**/api/assets/1', route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, json: { message: 'Asset save unavailable' } }) : route.fallback());
    await gotoAssets(page);
    await page.getByTitle('Edit', { exact: true }).click();
    await page.locator('#asset_name').fill('Changed Drill');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Asset save unavailable', { exact: true })).toBeVisible();
    await expect(page.locator('#asset_name')).toHaveValue('Changed Drill');
    expect(inventory.data.assets[0].asset_name).toBe('Workshop Drill');
    expect(inventory.mutations).toEqual([]);
  });
  test('failed disposal preserves active status', async ({ page }) => {
    await page.route('**/api/assets/1/dispose', route => route.fulfill({ status: 500, json: { message: 'Disposal unavailable' } }));
    await gotoAssets(page);
    page.once('dialog', dialog => dialog.accept());
    await page.getByTitle('Dispose', { exact: true }).click();
    await expect(page.getByText('Disposal unavailable', { exact: true })).toBeVisible();
    await expect(page.locator('tbody')).toContainText('Active');
    expect(inventory.mutations).toEqual([]);
  });
});
