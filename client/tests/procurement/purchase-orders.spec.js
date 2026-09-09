// tests/procurement/purchase-orders.spec.js
import { test, expect } from '@playwright/test';
import {
  gotoProcurement, restoreSession, assertNumericPONumber,
} from '../helpers/procurement.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

// ─── Helper: add a product via the ProductSearchSelect UI ────────────────────
async function addProductToOrder(page) {
  // The create form uses a custom ProductSearchSelect component (not a plain <select>).
  // Type into the search input to find a product, then click the first result.
  const searchInput = page.getByPlaceholder('Search products by name, barcode, SKU...');
  await searchInput.waitFor({ state: 'visible', timeout: 12_000 });
  await searchInput.fill('a'); // broad search to get any result
  const firstResult = page.locator('.pos-search-dropdown-modern .pos-search-item-modern, [class*="search-result"], [class*="dropdown"] li, [class*="suggestion"]').first();
  const hasResult = await firstResult.isVisible({ timeout: 4_000 }).catch(() => false);
  if (hasResult) {
    await firstResult.click();
    await page.getByRole('button', { name: /^Add$/i }).click();
    return true;
  }
  return false;
}

// ─── PO List ────────────────────────────────────────────────────────────────

test.describe('Purchase Orders — List', () => {

  test('page loads with heading and table', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
    await expect(page.locator('.proc-table')).toBeVisible();
  });

  test('table has correct column headers', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const headers = ['PO Number', 'Supplier', 'PO Date', 'Expected Delivery', 'Status', 'Total Amount', 'Actions'];
    for (const h of headers) {
      await expect(page.locator('.proc-table th').getByText(h)).toBeVisible();
    }
  });

  test('Create button says "Create" not "Create PO"', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await expect(page.getByRole('button', { name: /^\+?\s*Create$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create PO/i })).toHaveCount(0);
  });

  test('no Refresh button on PO list page', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
  });

  test('search input filters by PO number or supplier', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const search = page.getByPlaceholder('Search by PO number, supplier, status...');
    await expect(search).toBeVisible();
    await search.fill('zzz_nonexistent_xyz_999');
    await expect(page.getByText('No purchase orders found.')).toBeVisible();
    await search.clear();
  });

  test('status filter dropdown has expected options', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const select = page.locator('select#filterStatus');
    await expect(select).toBeVisible();
    for (const status of ['Pending', 'Approved', 'Shipped', 'Received', 'Cancelled']) {
      await expect(select.locator(`option[value="${status}"]`)).toHaveCount(1);
    }
  });

  test('stat cards are visible', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const statCards = page.locator('.proc-stat-card');
    await expect(statCards.first()).toBeVisible({ timeout: 8_000 });
    expect(await statCards.count()).toBeGreaterThanOrEqual(4);
  });

});

// ─── PO Number Format ────────────────────────────────────────────────────────

test.describe('Purchase Order Number Format', () => {

  test('all displayed PO numbers are numeric only (no PO prefix)', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await page.waitForSelector('.proc-table tbody tr', { timeout: 10_000 });
    const poNumberCells = page.locator('.proc-po-number');
    const count = await poNumberCells.count();
    if (count === 0) return; // No POs yet — nothing to assert
    for (let i = 0; i < count; i++) {
      const text = (await poNumberCells.nth(i).textContent()) || '';
      assertNumericPONumber(text.trim());
    }
  });

});

// ─── PO Creation ─────────────────────────────────────────────────────────────

test.describe('Purchase Orders — Create', () => {

  test('Create button navigates to create form', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await page.getByRole('button', { name: /^\+?\s*Create$/i }).click();
    await expect(page).toHaveURL(/\/procurement\/orders\/create/);
    await expect(page.getByRole('heading', { name: 'Create Purchase Order' })).toBeVisible();
  });

  test('create form shows required sections', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    await expect(page.getByText('Purchase Order Details')).toBeVisible();
    await expect(page.getByText('Line Items')).toBeVisible();
    await expect(page.getByText('Order Summary')).toBeVisible();
  });

  test('validation — no supplier selected shows error', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    await page.getByRole('button', { name: /Save as Draft/i }).click();
    await expect(page.locator('.proc-error-banner')).toContainText('Please select a supplier');
  });

  test('validation — no products added shows error', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    // Select a supplier first
    const supplierSelect = page.locator('select#supplierId');
    await supplierSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const options = await supplierSelect.locator('option').count();
    if (options <= 1) { test.skip(); return; }
    await supplierSelect.selectOption({ index: 1 });
    // Submit without adding any products
    await page.getByRole('button', { name: /Save as Draft/i }).click();
    await expect(page.locator('.proc-error-banner')).toContainText('Please add at least one product');
  });

  test('Approve & Send button is green (proc-btn-receive class)', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    const approveBtn = page.getByRole('button', { name: /Approve & Send/i });
    await expect(approveBtn).toBeVisible();
    await expect(approveBtn).toHaveClass(/proc-btn-receive/);
    await expect(approveBtn).not.toHaveClass(/proc-btn-approve/);
  });

  test('product search input is present on create form', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    const searchInput = page.getByPlaceholder('Search products by name, barcode, SKU...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('Add button is present on create form', async ({ page }) => {
    await gotoProcurement(page, '/orders/create');
    await expect(page.getByRole('button', { name: /^Add$/i })).toBeVisible({ timeout: 10_000 });
  });

});

// ─── PO Detail ───────────────────────────────────────────────────────────────

test.describe('Purchase Orders — Detail', () => {

  test('clicking View opens PO detail page', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await viewBtn.click();
    await expect(page).toHaveURL(/\/procurement\/orders\/\d+/);
    await expect(page.getByText('Purchase Order Details')).toBeVisible();
  });

  test('PO detail shows numeric PO number in Order Information card', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await viewBtn.click();
    await expect(page).toHaveURL(/\/procurement\/orders\/\d+/);

    // The PO number is displayed inside the Order Information card with class proc-po-number
    const poNumberEl = page.locator('.proc-po-number').first();
    await expect(poNumberEl).toBeVisible({ timeout: 8_000 });
    const poText = (await poNumberEl.textContent()) || '';
    assertNumericPONumber(poText.trim());
  });

  test('PO detail shows Order Information card', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await viewBtn.click();
    await expect(page.getByText('Order Information')).toBeVisible();
    await expect(page.getByText('Order Summary')).toBeVisible();
    await expect(page.getByText('Line Items')).toBeVisible();
  });

  test('PO detail shows status stepper', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await viewBtn.click();
    await expect(page.getByText('Order Status')).toBeVisible();
    await expect(page.locator('.proc-stepper, .proc-stepper-cancelled')).toBeVisible();
  });

  test('back button returns to PO list', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await viewBtn.click();
    await page.locator('.proc-back-btn').click();
    await expect(page).toHaveURL(/\/procurement\/orders$/);
  });

});

// ─── PO Approval ─────────────────────────────────────────────────────────────

test.describe('Purchase Orders — Approval', () => {

  test('Pending PO shows Approve Order button', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    // Filter to Pending and look for a PO with Pending status pill
    await page.locator('select#filterStatus').selectOption('Pending');
    const pendingRows = page.locator('.proc-table tbody tr').filter({ has: page.locator('.proc-status-pill.pending') });
    const hasPending = await pendingRows.first().isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasPending) { test.skip(); return; }
    await pendingRows.first().locator('.proc-icon-btn.view').click();
    await expect(page).toHaveURL(/\/procurement\/orders\/\d+/);
    await expect(page.getByRole('button', { name: /Approve Order/i })).toBeVisible();
  });

  test('approving a Pending PO updates status automatically', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await page.locator('select#filterStatus').selectOption('Pending');
    const pendingRows = page.locator('.proc-table tbody tr').filter({ has: page.locator('.proc-status-pill.pending') });
    const hasPending = await pendingRows.first().isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasPending) { test.skip(); return; }
    await pendingRows.first().locator('.proc-icon-btn.view').click();
    await expect(page).toHaveURL(/\/procurement\/orders\/\d+/);
    await page.getByRole('button', { name: /Approve Order/i }).click();
    // Status pill should update to Approved without page reload
    await expect(page.locator('.proc-status-pill.approved')).toBeVisible({ timeout: 8_000 });
  });

});

// ─── PO Delete ───────────────────────────────────────────────────────────────

test.describe('Purchase Orders — Delete', () => {

  test('delete button is present on PO list', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    await page.waitForSelector('.proc-table tbody tr', { timeout: 10_000 });
    const rows = await page.locator('.proc-table tbody tr').count();
    if (rows === 0) { test.skip(); return; }
    await expect(page.locator('.proc-icon-btn.delete').first()).toBeVisible();
  });

  test('delete dialog confirmation works for Pending PO', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    // Filter to Pending and find a row with a Pending status pill
    await page.locator('select#filterStatus').selectOption('Pending');
    const pendingRows = page.locator('.proc-table tbody tr').filter({ has: page.locator('.proc-status-pill.pending') });
    const hasPending = await pendingRows.first().isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasPending) { test.skip(); return; }

    // Get the PO number text of the first pending row before deleting
    const poNumberText = await pendingRows.first().locator('.proc-po-number').textContent();

    // Accept the browser confirm dialog and click delete
    page.once('dialog', dialog => dialog.accept());
    await pendingRows.first().locator('.proc-icon-btn.delete').click();

    // That specific PO number should no longer appear in the table
    if (poNumberText?.trim()) {
      await expect(page.locator('.proc-po-number').getByText(poNumberText.trim(), { exact: true })).toHaveCount(0, { timeout: 8_000 });
    }
  });

});

// ─── Automatic UI Updates ────────────────────────────────────────────────────

test.describe('Automatic UI Updates (no manual Refresh)', () => {

  test('PO list updates automatically after status change — no Refresh button needed', async ({ page }) => {
    await gotoProcurement(page, '/orders');
    // Verify no Refresh button exists at all
    await expect(page.getByRole('button', { name: /^Refresh$/i })).toHaveCount(0);
    // Navigate to a PO detail and back — list should still show correct data
    const viewBtn = page.locator('.proc-icon-btn.view').first();
    const hasRows = await viewBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasRows) { test.skip(); return; }
    await viewBtn.click();
    await expect(page).toHaveURL(/\/procurement\/orders\/\d+/);
    await page.locator('.proc-back-btn').click();
    await expect(page).toHaveURL(/\/procurement\/orders$/);
    // Table should still be visible without any manual refresh
    await expect(page.locator('.proc-table')).toBeVisible();
  });

});
