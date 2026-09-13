// tests/cashier/billing/billing-discount.spec.js
//
// Tests: Discount & Below-Cost Business Rule Enforcement
//
// Product: "Riller" (ID 1) — price=15000.00, cost=13500.00
//   Max allowed discount = 15000 - 13500 = 1500.00
//   Discount=1000 → net=14000 (> cost 13500) ✓ valid
//   Discount=2000 → net=13000 (< cost 13500) ✗ blocked

import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToBillingCounter,
  addProduct,
} from './billing.helpers.js';

test.describe('Cashier Billing Counter - Discount & Below-Cost Business Rules', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BD-01: Apply valid discount and verify net total recalculation', async ({ page }) => {
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    const discountInput = row.locator('input.discount-input-table');

    // Discount=1000 → net=14000.00 (well above cost 13500) ✓
    await discountInput.click({ clickCount: 3 });
    await discountInput.type('1000');
    await discountInput.press('Tab');

    // Row total: 15000 - 1000 = 14000.00
    await expect(row.locator('td').nth(4)).toContainText('Rs.14000.00');

    // Summary discount row shows 1000.00
    await expect(page.locator('.summary-row', { hasText: 'Discount' })).toContainText('Rs.1000.00');
    // Net total = 14000.00
    await expect(page.locator('.summary-total-value')).toContainText('Rs.14000.00');

    // No warning should appear for a valid discount
    await expect(row.locator('.discount-warning')).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BD-02: BUSINESS RULE — Discount below cost triggers warning and blocks checkout', async ({ page }) => {
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    const discountInput = row.locator('input.discount-input-table');

    // Discount=2000 → net=13000 (< cost 13500) ✗
    await discountInput.click({ clickCount: 3 });
    await discountInput.type('2000');
    await discountInput.press('Tab');

    // 1. Warning label visible in the row
    const warning = row.locator('.discount-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Final price below cost');

    // 2. Fill payment and attempt checkout
    await page.locator('#amountPaid').fill('15000');
    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    await completeBtn.click();

    // 3. Checkout BLOCKED — error toast visible
    await expect(
      page.getByText(/discount that makes final price lower than cost price/i).first()
    ).toBeVisible({ timeout: 5000 });

    // 4. Receipt modal must NOT appear
    await expect(page.locator('.receipt-modal-modern')).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BD-03: Zero discount maintains full selling price', async ({ page }) => {
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    const discountInput = row.locator('input.discount-input-table');

    await discountInput.click({ clickCount: 3 });
    await discountInput.type('0');
    await discountInput.press('Tab');

    // Full price 15000.00 unchanged
    await expect(row.locator('td').nth(4)).toContainText('Rs.15000.00');
    await expect(page.locator('.summary-total-value')).toContainText('Rs.15000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BD-04: Negative discount is rejected and does not inflate price', async ({ page }) => {
    await addProduct(page, 'Riller');

    const row = page.locator('.cart-table-modern tbody tr').first();
    const discountInput = row.locator('input.discount-input-table');

    await discountInput.click({ clickCount: 3 });
    await discountInput.type('-500');
    await discountInput.press('Tab');

    // Total must not exceed the unit price (15000.00)
    await expect(page.locator('.summary-total-value')).toContainText('Rs.15000.00');
  });
});
