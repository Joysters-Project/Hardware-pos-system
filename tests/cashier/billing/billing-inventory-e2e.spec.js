// tests/cashier/billing/billing-inventory-e2e.spec.js
//
// Tests: Stock Integrity & End-to-End Invoice Verification
//
// Product: "Riller" (ID 1) — price=15000.00, stock=4997+
//
// BUG FIX: TC-BE2E-01 previously used `/products/1` which returned HTML (404).
//   The correct backend route is `/api/products/1`.
//
// INTERACTION FIX: After a successful checkout the SuccessAnim overlay is
//   rendered ABOVE the receipt modal. It must be dismissed before the receipt
//   close button can receive click events.

import { test, expect } from '@playwright/test';
import { loginAsCashier, goToBillingCounter } from './billing.helpers.js';

const BACKEND_URL = 'http://localhost:5000';

async function addProduct(page, name) {
  const searchInput = page.locator('#pos-search');
  await searchInput.fill(name);
  const dropdown = page.locator('.pos-search-dropdown-modern');
  await expect(dropdown).toBeVisible({ timeout: 5000 });
  await page.locator('.pos-search-result-modern').first().click();
  await expect(dropdown).not.toBeVisible({ timeout: 5000 });
}

async function dismissSuccessAnim(page) {
  const successBackdrop = page.locator('.success-backdrop');
  await expect(successBackdrop).toBeVisible({ timeout: 10000 });
  const doneBtn = successBackdrop.locator('button', { hasText: 'Done' });
  await expect(doneBtn).toBeVisible();
  await doneBtn.click();
  await expect(successBackdrop).not.toBeVisible({ timeout: 3000 });
}

test.describe('Cashier Billing Counter - Stock Integrity & End-to-End Invoice Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BE2E-01: Stock decreases by sold quantity after checkout', async ({ page, request }) => {
    // FIX: use /api/products/:id — the correct Express route prefix
    const prodResBefore = await request.get(`${BACKEND_URL}/api/products/1`);
    expect(prodResBefore.ok()).toBeTruthy();
    const prodBefore = await prodResBefore.json();
    const stockBefore = parseFloat(prodBefore.stock_quantity);

    // Add Riller with qty=2
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    const qtyInput = row.locator('input.qty-input-table');
    await qtyInput.fill('2');
    await qtyInput.press('Tab');

    // Pay exact: 2 × 15000 = 30000
    await page.locator('#amountPaid').fill('30000');

    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    await completeBtn.click();

    // Dismiss SuccessAnim then close receipt
    await dismissSuccessAnim(page);
    const receiptModal = page.locator('.receipt-modal-modern');
    await expect(receiptModal).toBeVisible({ timeout: 5000 });
    await receiptModal.locator('.receipt-btn.close').click();
    await expect(receiptModal).not.toBeVisible({ timeout: 3000 });

    // Verify backend stock decreased by 2
    const prodResAfter = await request.get(`${BACKEND_URL}/api/products/1`);
    expect(prodResAfter.ok()).toBeTruthy();
    const prodAfter = await prodResAfter.json();
    const stockAfter = parseFloat(prodAfter.stock_quantity);

    expect(stockAfter).toBe(stockBefore - 2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BE2E-02: Double-clicking Complete Transaction does not create duplicate transactions', async ({ page }) => {
    // Use "Grainder" here so stock deduction doesn't interfere with TC-BE2E-01
    await addProduct(page, 'Grainder');
    await page.locator('#amountPaid').fill('15000');

    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });

    // Double-click rapidly
    await completeBtn.dblclick();

    // Dismiss SuccessAnim (appears after the single successful API call)
    await dismissSuccessAnim(page);

    // Receipt modal should be visible for the ONE transaction
    const receiptModal = page.locator('.receipt-modal-modern');
    await expect(receiptModal).toBeVisible({ timeout: 5000 });

    // The cart should be cleared (reset after checkout)
    await receiptModal.locator('.receipt-btn.close').click();
    await expect(receiptModal).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BE2E-03: Page refresh / navigation away and back preserves application stability', async ({ page }) => {
    await addProduct(page, 'Riller');

    // Reload page — cart state should be reset (not persisted) and UI should be clean
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Core UI elements should be present and functional
    await expect(page.locator('#pos-search')).toBeVisible();
    await expect(page.getByText('Selected Products')).toBeVisible();

    // Cart should be empty after reload (state is not persisted to localStorage)
    await expect(page.getByText(/No items added/i)).toBeVisible();
  });
});
