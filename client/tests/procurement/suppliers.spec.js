// tests/procurement/suppliers.spec.js
import { test, expect } from '@playwright/test';
import { gotoProcurement, restoreSession, uniqueSupplierName } from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Suppliers — List', () => {

  test('suppliers page loads with heading and table', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
    await expect(page.locator('.proc-table')).toBeVisible();
  });

  test('table headers are correct', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    const headers = ['Code', 'Supplier Name', 'Contact Person', 'Phone', 'Payment Terms', 'Status', 'Rating', 'Actions'];
    for (const h of headers) {
      await expect(page.locator('.proc-table th').getByText(h)).toBeVisible();
    }
  });

  test('search input filters suppliers', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    const search = page.getByPlaceholder('Search by name, code, contact, phone...');
    await expect(search).toBeVisible();
    await search.fill('zzz_nonexistent_xyz');
    await expect(page.getByText('No suppliers found.')).toBeVisible();
    await search.clear();
  });

  test('status filter dropdown works', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    const select = page.locator('select#filterStatus');
    await expect(select).toBeVisible();
    await select.selectOption('Active');
    await expect(page.locator('.proc-status-pill.inactive')).toHaveCount(0);
    await select.selectOption('');
  });

  test('Add Supplier button navigates to form', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    await page.getByRole('button', { name: 'Add Supplier' }).click();
    await expect(page).toHaveURL(/\/procurement\/suppliers\/add/);
    await expect(page.getByRole('heading', { name: 'Add Supplier' })).toBeVisible();
  });

  test('no Refresh button on suppliers page', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

});

test.describe('Suppliers — Create', () => {

  test('required field validation — HTML5 required prevents empty name submit', async ({ page }) => {
    await gotoProcurement(page, '/suppliers/add');
    // The supplier_name input has required attribute — HTML5 validation fires before JS
    const nameInput = page.getByPlaceholder('Enter supplier name');
    await expect(nameInput).toBeVisible();
    // Verify the input has the required attribute
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('payment terms validation — unselected shows error', async ({ page }) => {
    await gotoProcurement(page, '/suppliers/add');
    await page.getByPlaceholder('Enter supplier name').fill('Test Validation Supplier');
    await page.getByRole('button', { name: /Add Supplier/i }).click();
    await expect(page.locator('.proc-error-banner')).toContainText('Please select payment terms');
  });

  test('creates a new supplier successfully', async ({ page }) => {
    const name = uniqueSupplierName();
    await gotoProcurement(page, '/suppliers/add');

    await page.getByPlaceholder('Enter supplier name').fill(name);
    await page.getByPlaceholder('Contact person name').fill('Test Contact');
    // payment_terms select — first option is disabled placeholder, select a real value
    await page.locator('select[name="payment_terms"]').selectOption('Payment on Delivery');
    // status select — 'Active' is the first real option (index 0), not disabled
    // Use value directly instead of selectOption by text to avoid disabled-option issue
    await page.locator('select[name="status"]').evaluate(el => { el.value = 'Active'; });

    await page.getByRole('button', { name: /Add Supplier/i }).click();

    // Should redirect back to supplier list
    await expect(page).toHaveURL(/\/procurement\/suppliers$/, { timeout: 10_000 });
    // New supplier should appear automatically without manual refresh
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
  });

});

test.describe('Suppliers — Edit', () => {

  test('edit supplier form pre-fills existing data', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    const editBtn = page.locator('.proc-icon-btn.edit').first();
    await editBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await editBtn.click();
    await expect(page).toHaveURL(/\/procurement\/suppliers\/edit\//);
    await expect(page.getByRole('heading', { name: 'Edit Supplier' })).toBeVisible();
    const nameInput = page.getByPlaceholder('Enter supplier name');
    const val = await nameInput.inputValue();
    expect(val.trim().length).toBeGreaterThan(0);
  });

});

test.describe('Suppliers — Delete', () => {

  test('delete confirmation modal appears and can be cancelled', async ({ page }) => {
    await gotoProcurement(page, '/suppliers');
    const deleteBtn = page.locator('.proc-icon-btn.delete').first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await deleteBtn.click();
    // Use heading role to avoid strict-mode violation (modal h2 vs button text)
    await expect(page.getByRole('heading', { name: 'Remove Supplier' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Remove Supplier' })).toHaveCount(0);
  });

});
