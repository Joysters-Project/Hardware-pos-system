import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

test('finance navigation keeps Salary active on history and returns to expenses', async ({ page }) => {
  await page.goto('/expenses');
  const nav = page.locator('.procurement-top-nav');
  await nav.getByRole('link', { name: 'Salary', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Salary Management' })).toBeVisible();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page).toHaveURL(/\/salary\/history$/);
  await expect(page.getByRole('heading', { name: 'Salary History', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Salary', exact: true })).toHaveClass(/active/);
  await page.getByRole('link', { name: 'Back to Salary' }).click();
  await nav.getByRole('link', { name: 'Expenses', exact: true }).click();
  await expect(page).toHaveURL(/\/expenses$/);
});
