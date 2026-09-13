// tests/cashier/billing/billing-search.spec.js
import { test, expect } from '@playwright/test';
import { loginAsCashier, goToBillingCounter } from './billing.helpers.js';

test.describe('Cashier Billing Counter - Product Search & Selection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
    await goToBillingCounter(page);
  });

  test('TC-BS-01: Cashier can open billing counter and verify required UI elements', async ({ page }) => {
    // Check search bar
    const searchInput = page.locator('#pos-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search products/i);

    // Check catalog/selected products panel
    await expect(page.getByText('Selected Products')).toBeVisible();

    // Check initial cart state
    await expect(page.getByText(/No items (added|selected)/i).first()).toBeVisible();

    // Check Payment Summary panel
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();
    await expect(page.locator('#amountPaid')).toBeVisible();
    await expect(page.getByRole('button', { name: /Complete Transaction/i })).toBeVisible();
  });

  test('TC-BS-02: Search existing product by exact name and verify display', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    await searchInput.fill('Tokyo Cement 50kg');

    // Wait for dropdown results to appear
    const dropdown = page.locator('.pos-search-dropdown-modern');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Products found/i)).toBeVisible();

    // Verify correct product is displayed in results
    const productResult = page.locator('.pos-search-result-modern', { hasText: 'Tokyo Cement 50kg' });
    await expect(productResult.first()).toBeVisible();
  });

  test('TC-BS-03: Search by partial text', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    await searchInput.fill('Tok');

    const dropdown = page.locator('.pos-search-dropdown-modern');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Verify matching products appear
    await expect(page.locator('.pos-search-result-modern').first()).toBeVisible();
    const resultText = await page.locator('.pos-search-result-modern').first().innerText();
    expect(resultText.toLowerCase()).toContain('tok');
  });

  test('TC-BS-04: Search for non-existing product shows no-results message without crashing', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    await searchInput.fill('NonExistingProductXYZ12345');

    // Wait for no results message
    const noResults = page.locator('.pos-search-dropdown-modern.no-results');
    await expect(noResults).toBeVisible({ timeout: 5000 });
    await expect(noResults).toContainText('No products found');
  });

  test('TC-BS-05: Clear search input removes results dropdown', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    await searchInput.fill('Riller');

    await expect(page.locator('.pos-search-dropdown-modern')).toBeVisible({ timeout: 5000 });

    // Click clear button
    const clearBtn = page.locator('.pos-search-clear');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Input should be empty and dropdown hidden
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.pos-search-dropdown-modern')).not.toBeVisible();
  });

  test('TC-BS-06: Search with special characters and invalid input does not crash app', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    await searchInput.fill('!@#$%^&*()_+');

    // Application should stay functional and either show no results or handle safely
    await expect(searchInput).toHaveValue('!@#$%^&*()_+');
    await expect(page.getByText('Selected Products')).toBeVisible();
  });

  test('TC-BS-07: Search by Barcode and press Enter auto-adds to cart', async ({ page }) => {
    const searchInput = page.locator('#pos-search');
    // We verified product 6 has barcode '2345678'
    await searchInput.fill('2345678');
    await searchInput.press('Enter');

    // Product should be auto-added to the cart table
    const cartTable = page.locator('.cart-table-modern');
    await expect(cartTable).toBeVisible({ timeout: 5000 });
    await expect(cartTable).toContainText('Bike break cable');
  });
});
