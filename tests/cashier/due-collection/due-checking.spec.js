// tests/cashier/due-collection/due-checking.spec.js
import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToDueChecking,
} from './due.helpers.js';

test.describe('Cashier Due Management - Due Checking Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToDueChecking(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-01: Verify required Due Checking UI elements on initial load', async ({ page }) => {
    // Header & title
    await expect(page.getByRole('heading', { name: 'Due Management' })).toBeVisible();
    await expect(page.getByText('Track dues and collect outstanding balances')).toBeVisible();

    // Tab switcher with Due Checking active
    const checkingTab = page.locator('.pos-tab-btn', { hasText: 'Due Checking' });
    const collectionTab = page.locator('.pos-tab-btn', { hasText: 'Due Collection' });
    await expect(checkingTab).toHaveClass(/active/);
    await expect(collectionTab).not.toHaveClass(/active/);

    // Search input & button
    const searchInput = page.locator('#due-check-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search by phone number/i);
    await expect(page.getByRole('button', { name: /Check Due/i })).toBeVisible();

    // Empty state placeholders in summary grid
    await expect(page.locator('.summary-card', { hasText: 'Customer' })).toContainText('—');
    await expect(page.locator('.summary-card', { hasText: 'Phone' })).toContainText('—');
    await expect(page.locator('.summary-card', { hasText: 'Outstanding Bills' })).toContainText('0');
    await expect(page.locator('.summary-card', { hasText: 'Total Due' })).toContainText('Rs 0.00');

    // Table empty prompt
    await expect(page.getByText('Search a customer to review their outstanding balance.')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-02: Submitting empty phone number triggers validation error', async ({ page }) => {
    const checkDueBtn = page.getByRole('button', { name: /Check Due/i });
    await checkDueBtn.click();

    await expect(page.getByText(/Enter a phone number/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-03: Submitting invalid phone format displays phone validation error', async ({ page }) => {
    const searchInput = page.locator('#due-check-search');
    // Entering incomplete phone (e.g. 077123)
    await searchInput.fill('077123');
    await page.getByRole('button', { name: /Check Due/i }).click();

    await expect(page.getByText(/Must be exactly 10 digits/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-04: Searching non-existing customer phone displays customer not found error', async ({ page }) => {
    const searchInput = page.locator('#due-check-search');
    await searchInput.fill('0770000000');
    await page.getByRole('button', { name: /Check Due/i }).click();

    await expect(page.getByText(/No customer found/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-05: Searching valid customer displays due summary cards and bills breakdown', async ({ page }) => {
    // Customer 'bala' with phone '0771234567' has partial bills in the database
    const searchInput = page.locator('#due-check-search');
    await searchInput.fill('0771234567');
    await page.getByRole('button', { name: /Check Due/i }).click();

    // Verify Customer card populates
    const customerCard = page.locator('.summary-card', { hasText: 'Customer' });
    await expect(customerCard).toContainText('bala', { timeout: 8000 });

    const phoneCard = page.locator('.summary-card', { hasText: 'Phone' });
    await expect(phoneCard).toContainText('0771234567');

    // Verify Bills count is greater than 0
    const billsCard = page.locator('.summary-card', { hasText: 'Outstanding Bills' });
    await expect(billsCard.locator('.summary-value')).not.toHaveText('0');

    // Verify breakdown table rows exist
    const rows = page.locator('.proc-table tbody tr:not(.due-details-row)');
    await expect(rows.first()).toBeVisible();

    // First bill row should have partial pill
    await expect(rows.first().locator('.proc-status-pill.pending')).toContainText('Partial');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-06: Toggle product details row expands and collapses item list', async ({ page }) => {
    const searchInput = page.locator('#due-check-search');
    await searchInput.fill('0771234567');
    await page.getByRole('button', { name: /Check Due/i }).click();

    await expect(page.locator('.summary-card', { hasText: 'Customer' })).toContainText('bala', { timeout: 8000 });

    const toggleBtn = page.locator('.due-details-toggle').first();
    await expect(toggleBtn).toBeVisible();

    // Click to expand details
    await toggleBtn.click();
    const detailsRow = page.locator('.due-details-row').first();
    await expect(detailsRow).toBeVisible();
    await expect(detailsRow).toContainText('Product details');

    // Click again to collapse
    await toggleBtn.click();
    await expect(detailsRow).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-DC-07: Tab switcher smoothly switches to Due Collection view', async ({ page }) => {
    const collectionTab = page.locator('.pos-tab-btn', { hasText: 'Due Collection' });
    await collectionTab.click();

    await page.waitForURL(/\/cashier-panel\/due-collection\/collect/);
    await expect(page.locator('#due-collection-search')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Collect payment' })).toBeVisible();
  });
});
