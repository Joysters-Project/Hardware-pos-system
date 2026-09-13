// tests/cashier/billing/billing-cart.spec.js
//
// Tests: Cart & Quantity Operations
//
// Product catalogue used (confirmed from DB):
//   - "Riller"    (ID 1): price=15000, cost=13500, stock=4997  ← unique name
//   - "Grainder"  (ID 4): price=15000, cost=9999.98, stock=498 ← unique name
//   - "2mm screw" (ID 5): price=150,   cost=99.99,  stock=1   ← low stock
//
// DELIBERATE CHOICE: We avoid "Tokyo Cement 50kg" because two DB rows share
//   that name (IDs 3 & 8 at very different prices), making price assertions
//   non-deterministic depending on which row the search returns first.

import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToBillingCounter,
  addProduct,
} from './billing.helpers.js';

test.describe('Cashier Billing Counter - Cart & Quantity Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-01: Add a single product to cart and verify calculations', async ({ page }) => {
    // Use "Riller": price=15000.00, unique name → deterministic result
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Riller');

    // Default quantity should be 1
    const qtyInput = row.locator('input.qty-input-table');
    await expect(qtyInput).toHaveValue('1');

    // Subtotal = 1 × 15000 = 15000.00
    await expect(page.locator('.summary-row').first()).toContainText('Rs.15000.00');
    await expect(page.locator('.summary-total-value')).toContainText('Rs.15000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-02: Add multiple different products and verify totals sum correctly', async ({ page }) => {
    // Riller (15000) + Grainder (15000) = 30000.00
    await addProduct(page, 'Riller');
    await addProduct(page, 'Grainder');

    const rows = page.locator('.cart-table-modern tbody tr');
    await expect(rows).toHaveCount(2);

    await expect(page.locator('.summary-total-value')).toContainText('Rs.30000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-03: Add the same product multiple times increases quantity', async ({ page }) => {
    // Add "Riller" twice – the cart should merge into one row with qty=2
    await addProduct(page, 'Riller');
    await addProduct(page, 'Riller');

    const rows = page.locator('.cart-table-modern tbody tr');
    await expect(rows).toHaveCount(1);

    const qtyInput = rows.first().locator('input.qty-input-table');
    await expect(qtyInput).toHaveValue('2');
    await expect(page.locator('.summary-total-value')).toContainText('Rs.30000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-04: Manually update quantity and verify row and cart recalculation', async ({ page }) => {
    // Riller: 3 × 15000 = 45000.00
    await addProduct(page, 'Riller');

    const qtyInput = page.locator('.cart-table-modern tbody tr').first().locator('input.qty-input-table');
    // Use triple-click + type to ensure the value fully replaces in all browsers
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.type('3');
    await qtyInput.press('Tab');

    await expect(page.locator('.summary-total-value')).toContainText('Rs.45000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // APPLICATION BEHAVIOUR: handleUpdateQty() calls handleRemoveFromCart()
  // when qty <= 0, so setting qty=0 via the onChange removes the item.
  test('TC-BC-05: Entering quantity <= 0 removes item from cart', async ({ page }) => {
    await addProduct(page, 'Riller');
    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(1);

    const qtyInput = page.locator('.cart-table-modern tbody tr').first().locator('input.qty-input-table');
    // Select all text and replace with 0; use type() to trigger React onChange
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.type('0');
    await page.keyboard.press('Tab');

    // Row should be removed
    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText(/No items added/i)).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-06: Entering quantity exceeding available stock triggers warning and caps at stock', async ({ page }) => {
    // "2mm screw" has only 1 unit in stock
    await addProduct(page, '2mm screw');

    const qtyInput = page.locator('.cart-table-modern tbody tr').first().locator('input.qty-input-table');
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.type('500');
    await qtyInput.press('Tab');

    // Insufficient stock toast should appear
    await expect(page.getByText(/Insufficient stock/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-07: Remove product using row delete button', async ({ page }) => {
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    await expect(row).toBeVisible();

    await row.locator('.table-remove-btn').click();

    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(0);
    await expect(page.getByText(/No items added/i)).toBeVisible();
    await expect(page.locator('.summary-total-value')).toContainText('Rs.0.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BC-08: Clear all products from cart using Clear All button', async ({ page }) => {
    await addProduct(page, 'Riller');
    await addProduct(page, 'Grainder');

    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(2);

    const clearAllBtn = page.getByRole('button', { name: /Clear All/i });
    await expect(clearAllBtn).toBeVisible();
    await clearAllBtn.click();

    await expect(page.locator('.cart-table-modern tbody tr')).toHaveCount(0);
    await expect(page.getByText(/No items added/i)).toBeVisible();
    await expect(page.locator('.summary-total-value')).toContainText('Rs.0.00');
  });
});
