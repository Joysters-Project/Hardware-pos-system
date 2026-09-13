// tests/cashier/due-collection/due-collection.spec.js
import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToDueCollection,
  dismissSuccessAnim,
} from './due.helpers.js';

test.describe('Cashier Due Management - Due Collection Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToDueCollection(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-01: Verify required Due Collection UI elements on initial load', async ({ page }) => {
    // Header & title
    await expect(page.getByRole('heading', { name: 'Due Management' })).toBeVisible();

    // Tab switcher with Due Collection active
    const collectionTab = page.locator('.pos-tab-btn', { hasText: 'Due Collection' });
    await expect(collectionTab).toHaveClass(/active/);

    // Search input & button
    const searchInput = page.locator('#due-collection-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search by 10-digit phone number/i);
    await expect(page.locator('.due-search-box button', { hasText: 'Search' })).toBeVisible();

    // Empty state
    await expect(page.getByText('No outstanding bills found.')).toBeVisible();

    // Right sidebar initial state
    await expect(page.getByRole('heading', { name: 'Collect payment' })).toBeVisible();
    await expect(page.locator('.collect-btn')).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-02: Submitting empty search input shows validation toast', async ({ page }) => {
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();
    await expect(page.getByText(/Enter a phone number/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-03: Submitting invalid phone shows validation toast', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('077123'); // only 6 digits
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    await expect(page.getByText(/Must be exactly 10 digits/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-04: Search existing customer displays customer summary and outstanding bills table', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('0771234567');
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    // Customer summary
    const summary = page.locator('.customer-summary');
    await expect(summary).toBeVisible({ timeout: 8000 });
    await expect(summary).toContainText('bala');
    await expect(summary).toContainText('0771234567');
    await expect(summary.locator('.val-red')).toBeVisible();

    // Table rows
    const rows = page.locator('.proc-table tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().locator('.proc-code-badge')).toContainText(/INV-/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-05: Selecting a bill auto-fills full due amount and calculates zero balance after collection', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('0771234567');
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    await expect(page.locator('.customer-summary')).toBeVisible({ timeout: 8000 });

    // Select the first bill
    const firstRow = page.locator('.proc-table tbody tr').first();
    await firstRow.click();
    await expect(firstRow).toHaveClass(/selected/);

    // Verify amount input is auto-populated with balance due
    const amountInput = page.locator('#due-amount');
    const val = await amountInput.inputValue();
    expect(parseFloat(val)).toBeGreaterThan(0);

    // Sidebar summary updates
    await expect(page.locator('.collection-summary .row.bold .val-red')).toBeVisible();
    // After collection shows Fully paid
    await expect(page.locator('.after-collection')).toContainText(/Fully paid/i);

    // Collect button is enabled
    const collectBtn = page.locator('.collect-btn');
    await expect(collectBtn).toBeEnabled();
    await expect(collectBtn).toContainText(val);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-06: Entering partial collection amount recalculates remaining balance and blocks overpayment', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('0771234567');
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    await expect(page.locator('.customer-summary')).toBeVisible({ timeout: 8000 });

    const firstRow = page.locator('.proc-table tbody tr').first();
    await firstRow.click();

    const amountInput = page.locator('#due-amount');
    const fullDue = parseFloat(await amountInput.inputValue());

    // Enter smaller partial payment
    const partialAmount = Math.max(1, Math.floor(fullDue / 2));
    await amountInput.fill(String(partialAmount));

    // Verify after-collection reflects remainder
    const expectedRemainder = (fullDue - partialAmount).toFixed(2);
    await expect(page.locator('.after-collection')).toContainText(`Balance: Rs. ${expectedRemainder}`);

    // Verify overpayment is blocked (button disabled when amount > balanceDue)
    await amountInput.fill(String(fullDue + 1000));
    await expect(page.locator('.collect-btn')).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-07: Select All checkbox toggles all bills for multi-bill collection', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('0771234567');
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    await expect(page.locator('.customer-summary')).toBeVisible({ timeout: 8000 });

    const headerCheckbox = page.locator('.proc-table thead input[type="checkbox"]');
    await headerCheckbox.check();

    // All rows should have selected class
    const rows = page.locator('.proc-table tbody tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).toHaveClass(/selected/);
    }

    // Sidebar indicates multi-bill selection
    if (rowCount > 1) {
      await expect(page.locator('.collection-summary')).toContainText(`${rowCount} bills selected`);
      await expect(page.locator('.collect-btn')).toContainText(/Collect All/i);
    }

    // Uncheck selects none
    await headerCheckbox.uncheck();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).not.toHaveClass(/selected/);
    }
    await expect(page.locator('.collect-btn')).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DCOL-08: Complete due collection triggers SuccessAnim modal and refreshes records', async ({ page }) => {
    const searchInput = page.locator('#due-collection-search');
    await searchInput.fill('0771234567');
    await page.locator('.due-search-box button', { hasText: 'Search' }).click();

    await expect(page.locator('.customer-summary')).toBeVisible({ timeout: 8000 });

    const firstRow = page.locator('.proc-table tbody tr').first();
    await firstRow.click();

    const amountInput = page.locator('#due-amount');
    // Collect 100.00 as partial collection to verify end-to-end flow without exhausting test data
    await amountInput.fill('100');

    const collectBtn = page.locator('.collect-btn');
    await expect(collectBtn).toBeEnabled();
    await collectBtn.click();

    // Verify SuccessAnim modal appears
    const successBackdrop = page.locator('.success-backdrop');
    await expect(successBackdrop).toBeVisible({ timeout: 10000 });
    await expect(successBackdrop).toContainText('Payment Received');
    await expect(successBackdrop).toContainText('100.00');

    // Dismiss SuccessAnim
    await dismissSuccessAnim(page);

    // Summary table should reload
    await expect(page.locator('.customer-summary')).toBeVisible({ timeout: 5000 });
  });
});
