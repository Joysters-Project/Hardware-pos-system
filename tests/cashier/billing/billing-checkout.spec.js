// tests/cashier/billing/billing-checkout.spec.js
//
// Tests: Checkout & Payment Workflows
//
// Product: "Riller" (ID 1) — price=15000.00, cost=13500.00, stock=4997
//   Exact payment: 15000 → change = 0.00
//   Over payment:  20000 → change = 5000.00
//   Partial:        8000 → due   = 7000.00
//
// IMPORTANT INTERACTION SEQUENCE AFTER CHECKOUT:
//   After clicking "Complete Transaction":
//     1. SuccessAnim overlay appears (full-screen, intercepts pointer events)
//     2. Receipt modal is rendered underneath
//   The test MUST dismiss the SuccessAnim ("Done" button) BEFORE
//   the receipt modal is reachable. Then wait for the SuccessAnim
//   to completely exit (300 ms fade) before clicking receipt actions.

import { test, expect } from '@playwright/test';
import { loginAsCashier, goToBillingCounter, dismissSuccessAnim } from './billing.helpers.js';

/** Add a uniquely-named product and wait for the dropdown to close. */
async function addProduct(page, name) {
  const searchInput = page.locator('#pos-search');
  await searchInput.fill(name);
  const dropdown = page.locator('.pos-search-dropdown-modern');
  await expect(dropdown).toBeVisible({ timeout: 5000 });
  await page.locator('.pos-search-result-modern').first().click();
  await expect(dropdown).not.toBeVisible({ timeout: 5000 });
}

test.describe('Cashier Billing Counter - Checkout & Payment Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BP-01: Empty cart blocks checkout', async ({ page }) => {
    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    // Button is disabled when cart is empty
    await expect(completeBtn).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BP-02: Zero payment is considered as partial bill but no payment blocks transaction', async ({ page }) => {
    await addProduct(page, 'Riller');

    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });

    // No payment entered (empty input) → blocks transaction (disabled)
    await expect(completeBtn).toBeDisabled();

    // Zero payment (0 entered) is considered a partial bill
    await page.locator('#amountPaid').fill('0');
    await expect(completeBtn).toBeEnabled();

    // Verify it is treated as a partial bill (shows balance due)
    const dueCard = page.locator('.change-card.negative');
    await expect(dueCard).toBeVisible();
    await expect(dueCard).toContainText(/Balance Due/i);

    // Attempting checkout with 0 without customer details should fail
    await completeBtn.click();
    await expect(page.getByText(/Phone number required/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BP-03: Full cash payment with exact amount generates invoice and correct change', async ({ page }) => {
    // Riller: price=15000.00. Pay exact 15000.00 → change Rs.0.00
    await addProduct(page, 'Riller');
    await page.locator('#amountPaid').fill('15000');

    // Change card should show Rs.0.00
    const changeCard = page.locator('.change-card.positive');
    await expect(changeCard).toBeVisible();
    await expect(changeCard).toContainText('Rs.0.00');

    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // Dismiss SuccessAnim FIRST (it overlays the receipt modal)
    await dismissSuccessAnim(page);

    // Receipt modal is now accessible
    const receiptModal = page.locator('.receipt-modal-modern');
    await expect(receiptModal).toBeVisible({ timeout: 5000 });

    // Verify invoice fields
    await expect(receiptModal.locator('.receipt-meta-grid')).toContainText(/INV-\d{4}-\d{4}/);
    await expect(receiptModal.locator('.receipt-items')).toContainText('Riller');
    await expect(receiptModal.locator('.receipt-totals')).toContainText('Rs.15000.00');

    // Close receipt by clicking the close button
    await receiptModal.locator('.receipt-btn.close').click();
    await expect(receiptModal).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BP-04: Full cash payment with excess amount calculates correct change to return', async ({ page }) => {
    // Riller: price=15000.00. Pay 20000.00 → change Rs.5000.00
    await addProduct(page, 'Riller');
    await page.locator('#amountPaid').fill('20000');

    const changeCard = page.locator('.change-card.positive');
    await expect(changeCard).toBeVisible();
    await expect(changeCard.locator('.change-value')).toContainText('Rs.5000.00');

    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // Dismiss SuccessAnim overlay
    await dismissSuccessAnim(page);

    const receiptModal = page.locator('.receipt-modal-modern');
    await expect(receiptModal).toBeVisible({ timeout: 5000 });
    await expect(receiptModal.locator('.receipt-totals')).toContainText('Change');
    await expect(receiptModal.locator('.receipt-totals')).toContainText('Rs.5000.00');

    await receiptModal.locator('.receipt-btn.close').click();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BP-05: Partial payment calculates balance due and enforces customer requirements', async ({ page }) => {
    // Riller: price=15000.00. Pay 8000.00 → due Rs.7000.00
    await addProduct(page, 'Riller');
    await page.locator('#amountPaid').fill('8000');

    // Negative/due change card should be visible
    const dueCard = page.locator('.change-card.negative');
    await expect(dueCard).toBeVisible();
    await expect(dueCard.locator('.change-value')).toContainText('Rs.7000.00');

    // Customer section auto-appears for partial payments
    await expect(page.getByText('Customer Information')).toBeVisible();
    await expect(page.getByText(/Partial payment will save this customer automatically/i)).toBeVisible();

    // Attempting checkout without customer details shows error toast
    const completeBtn = page.getByRole('button', { name: /Complete Transaction/i });
    await completeBtn.click();
    await expect(page.getByText(/Phone number required/i).first()).toBeVisible({ timeout: 5000 });

    // Attach an existing customer
    const phoneInput = page.getByPlaceholder('Phone Number (Required)');
    await phoneInput.fill('0771234567');
    await phoneInput.press('Tab');
    // Wait for lookup — use .first() to avoid strict-mode error (two .found msgs)
    await expect(page.locator('.partial-message.found').first()).toBeVisible({ timeout: 5000 });

    // Now complete the transaction
    await completeBtn.click();

    // Dismiss SuccessAnim
    await dismissSuccessAnim(page);

    const receiptModal = page.locator('.receipt-modal-modern');
    await expect(receiptModal).toBeVisible({ timeout: 5000 });
    await expect(receiptModal.locator('.receipt-totals')).toContainText('Due Balance');
    await expect(receiptModal.locator('.receipt-totals')).toContainText('Rs.7000.00');

    await receiptModal.locator('.receipt-btn.close').click();
  });
});
