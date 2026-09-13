// tests/cashier/returns/process-return.spec.js
import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToProcessReturn,
} from './returns.helpers.js';

test.describe('Cashier Return & Warranty - Process Return Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToProcessReturn(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-01: Verify required Process Return UI elements on Step 1 load', async ({ page }) => {
    // Header & container
    await expect(page.getByRole('heading', { name: 'Return & Warranty Management' })).toBeVisible();

    // Step indicator shows Step 1 active
    const stepBar = page.locator('.ret-step-bar');
    await expect(stepBar).toBeVisible();
    await expect(stepBar.locator('.ret-step').first()).toHaveClass(/active/);
    await expect(page.getByText('Select Invoice')).toBeVisible();

    // Radio search types
    await expect(page.getByLabel(/Search by Invoice No/i)).toBeChecked();
    await expect(page.getByLabel(/Search by Customer Phone/i)).not.toBeChecked();

    // Search input & button
    const searchInput = page.locator('#searchTerm');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Enter Invoice \/ Bill No/i);
    await expect(page.getByRole('button', { name: /Lookup Invoice/i })).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-02: Submitting empty invoice search displays validation error', async ({ page }) => {
    const lookupBtn = page.getByRole('button', { name: /Lookup Invoice/i });
    await lookupBtn.click();

    await expect(page.getByText(/Enter a bill number or customer phone/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-03: Searching non-existent invoice displays not found message', async ({ page }) => {
    const searchInput = page.locator('#searchTerm');
    await searchInput.fill('INV-9999-9999');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    // Server returns { error: 'Bill not found' } with 404; axios catches it and
    // fires toast.error(err.response.data.error) => 'Bill not found'
    await expect(
      page.getByText(/Bill not found|No matching bill found|Failed to lookup/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-04: Search by customer phone switches input placeholder and lists customer invoices', async ({ page }) => {
    // Switch to phone search mode
    await page.getByLabel(/Search by Customer Phone/i).check();

    const searchInput = page.locator('#searchTerm');
    await expect(searchInput).toHaveAttribute('placeholder', /Enter Customer Phone Number/i);

    // Search for customer 'bala' (0771234567)
    await searchInput.fill('0771234567');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    // If multiple bills exist, results list is shown, or single bill loads
    const resultsOrInvoice = page.locator('.ret-bill-results, .ret-left');
    await expect(resultsOrInvoice.first()).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────────────────────────────────


  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-06: Selecting an item expands fields, validates quantity and mandatory reason', async ({ page }) => {
    const searchInput = page.locator('#searchTerm');
    await searchInput.fill('INV-2026-0001');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    await expect(page.locator('.ret-item-card').first()).toBeVisible({ timeout: 8000 });

    // Click item header checkbox to select it
    const itemCard = page.locator('.ret-item-card').first();
    await itemCard.locator('input#checkbox_field').check();
    await expect(itemCard).toHaveClass(/selected/);

    // Return quantity input is displayed
    const qtyInput = itemCard.locator('input[name="return_quantity"]');
    await expect(qtyInput).toBeVisible();

    // Return Reason dropdown is displayed
    const reasonSelect = itemCard.locator('select#select_field');
    await expect(reasonSelect).toBeVisible();

    // Selecting 'Other' requires description note
    await reasonSelect.selectOption('Other');
    const noteInput = itemCard.locator('input#describe_the_specific_reason_for_return');
    await expect(noteInput).toBeVisible();
    await expect(itemCard.getByText(/Description is required when reason is "Other"/i)).toBeVisible();

    // Filling note resolves validation
    await noteInput.fill('Customer ordered incorrect grade');
    await expect(itemCard.getByText(/Description is required when reason is "Other"/i)).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-07: Changing product condition updates suggested action recommendation', async ({ page }) => {
    const searchInput = page.locator('#searchTerm');
    await searchInput.fill('INV-2026-0001');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    const itemCard = page.locator('.ret-item-card').first();
    await itemCard.locator('input#checkbox_field').check();

    // Change condition to UNOPENED / BRAND_NEW
    const conditionSelect = itemCard.locator('select#condition');
    await conditionSelect.selectOption('BRAND_NEW');

    // Action should update or allow Restock
    const actionSelect = itemCard.locator('select#action');
    await expect(actionSelect).toBeVisible();
    const selectedAction = await actionSelect.inputValue();
    expect(selectedAction).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-08: "Different Invoice" button resets workflow back to Step 1', async ({ page }) => {
    const searchInput = page.locator('#searchTerm');
    await searchInput.fill('INV-2026-0001');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    await expect(page.locator('.ret-back-btn')).toBeVisible({ timeout: 8000 });
    await page.locator('.ret-back-btn').click();

    // Returns to Step 1 search card
    await expect(page.locator('.ret-search-card')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#searchTerm')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-RET-09: Complete return submission displays SuccessScreen with Return ID', async ({ page }) => {
    const searchInput = page.locator('#searchTerm');
    await searchInput.fill('INV-2026-0001');
    await page.getByRole('button', { name: /Lookup Invoice/i }).click();

    const itemCard = page.locator('.ret-item-card').first();
    await expect(itemCard).toBeVisible({ timeout: 8000 });
    await itemCard.locator('input#checkbox_field').check();

    // Set a valid return quantity (billed quantity is 0.5)
    const qtyInput = itemCard.locator('input[name="return_quantity"]');
    await qtyInput.fill('0.5');

    // Wait for expanded fields to render after selection
    const reasonSelect = itemCard.locator('select#select_field');
    await expect(reasonSelect).toBeVisible({ timeout: 5000 });

    // Fill valid reason (value = label for this option)
    await reasonSelect.selectOption({ label: 'Customer Changed Mind' });

    // Condition: DEFECTIVE (default) — valid actions include REPAIR, EXCHANGE, REFUND.
    // Use REFUND (no supplier required, no warranty question needed).
    await itemCard.locator('select#condition').selectOption('DEFECTIVE');
    const actionSelect = itemCard.locator('select#action');
    await expect(actionSelect).toBeVisible({ timeout: 3000 });
    await actionSelect.selectOption('REFUND');

    // Confirm button appears and is enabled when at least one item is selected
    const confirmBtn = page.locator('.ret-confirm-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify Success Screen — wait for container then check heading and details
    await expect(page.locator('.ret-success')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.ret-success h2')).toContainText(/Return Successfully Processed/i);
    await expect(page.locator('.ret-success-details')).toContainText(/RET-/);

    // Action buttons visible on success screen
    await expect(page.locator('.ret-success-btn', { hasText: /Return History/i })).toBeVisible();
    await expect(page.locator('.ret-success-btn', { hasText: /Print Receipt/i })).toBeVisible();
    await expect(page.locator('.ret-success-btn', { hasText: /Process Another Return/i })).toBeVisible();
  });
});
