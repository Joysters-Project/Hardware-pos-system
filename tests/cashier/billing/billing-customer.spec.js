// tests/cashier/billing/billing-customer.spec.js
//
// Tests: Customer Attachment & Lookup
//
// Product: "Riller" (ID 1, price=15000.00) — unique, deterministic.
// Known customer in DB: phone='0771234567', name='bala', address='vavuniya'
//
// DOM NOTES:
//   - `.partial-message.found` appears in TWO places when isPartial && customerExists.
//     Always use .first() to avoid strict-mode violations.
//   - phoneError renders as inline-styled `<div style="...color:#ef4444">` inside
//     `.partial-input-group`. We match it by looking for the AlphaCircle SVG sibling
//     or any text inside that container matching the validation message.

import { test, expect } from '@playwright/test';
import {
  loginAsCashier,
  goToBillingCounter,
  addProduct,
} from './billing.helpers.js';

test.describe('Cashier Billing Counter - Customer Attachment & Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BCUST-01: Toggle "Save customer on this full payment" displays customer input fields', async ({ page }) => {
    // Riller = 15000.00
    await addProduct(page, 'Riller');

    // Pay exact full amount → full payment mode
    await page.locator('#amountPaid').fill('15000');

    // Toggle should appear and be "Off"
    const toggleBtn = page.locator('.customer-save-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await expect(toggleBtn).toContainText('Off');

    await toggleBtn.click();
    await expect(toggleBtn).toContainText('On');

    // Customer fields now visible
    await expect(page.getByPlaceholder('Customer Name (Required)')).toBeVisible();
    await expect(page.getByPlaceholder('Phone Number (Required)')).toBeVisible();
    await expect(page.getByPlaceholder('Address')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BCUST-02: Lookup existing customer by phone auto-populates name and address', async ({ page }) => {
    await addProduct(page, 'Riller');

    // Use partial payment (less than 15000) to auto-open customer section
    await page.locator('#amountPaid').fill('10000');

    const phoneInput = page.getByPlaceholder('Phone Number (Required)');
    await expect(phoneInput).toBeVisible({ timeout: 5000 });
    await phoneInput.fill('0771234567');
    await phoneInput.press('Tab');

    // FIX: .partial-message.found appears in two DOM locations when isPartial&&customerExists.
    // Use .first() to avoid Playwright strict-mode violation.
    const foundMsg = page.locator('.partial-message.found').first();
    await expect(foundMsg).toBeVisible({ timeout: 5000 });

    await expect(page.getByPlaceholder('Customer Name (Required)')).toHaveValue('bala');
    await expect(page.getByPlaceholder('Address')).toHaveValue('vavuniya');
  });

  // ──────────────────────────────────────────────────────────────────────────
  test('TC-BCUST-03: Invalid phone number shows validation error', async ({ page }) => {
    await addProduct(page, 'Riller');

    // Use partial payment to auto-open customer section
    await page.locator('#amountPaid').fill('10000');

    const phoneInput = page.getByPlaceholder('Phone Number (Required)');
    await expect(phoneInput).toBeVisible({ timeout: 5000 });

    // Enter an obviously invalid phone (only 5 digits)
    await phoneInput.fill('12345');
    await phoneInput.press('Tab');

    // FIX: The phoneError div uses inline styles and has no dedicated CSS class.
    // The Sri Lankan validator produces a text message. We look for that text
    // anywhere on the page as a child of the phone input container.
    // Strategy: target the error div by its sibling relationship to the phone input.
    //   The phone input is #phone_number_required. Its parent is .partial-input-group.
    //   The error div is a direct child of that parent rendered after the input.
    //
    // Broader fallback: check page for any text containing 'digit' or 'invalid'
    // within the customer section container.
    const customerSection = page.locator('.partial-payment-section, .customer-section, .payment-section').first();
    const errorText = page.locator('#phone_number_required').locator('..').locator('div').filter({
      hasText: /digit|invalid|format/i,
    });
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
    await expect(errorText.first()).toContainText(/digit|invalid|format/i);
  });
});
