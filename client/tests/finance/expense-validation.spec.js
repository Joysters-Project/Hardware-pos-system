import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

test('expense validation prevents zero amount and missing Other description', async ({ page, finance }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'Add Expense' }).click();
  await page.locator('#expense_type').selectOption('Transport');
  await page.locator('#amount').fill('0');
  await page.locator('#expense_date').fill('2026-09-09');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
  await page.locator('#amount').fill('100');
  await page.locator('#expense_type').selectOption('Other');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('#description')).toHaveAttribute('required', '');
  expect(await page.locator('#description').evaluate(el => el.validity.valueMissing)).toBe(true);
  expect(finance.writes).toHaveLength(0);
});

test.describe('Expense Validation - Required Fields and Amount Rules', () => {
  for (const [field, value, validity] of [['expense_type', '', 'valueMissing'], ['amount', '', 'valueMissing'], ['expense_date', '', 'valueMissing'], ['amount', '-1', 'rangeUnderflow'], ['amount', '1.001', 'stepMismatch']]) {
    test(`${field} rejects ${value || 'empty'} input`, async ({ page, finance }) => {
      await page.goto('/expenses');
      await page.getByRole('button', { name: 'Add Expense' }).click();
      await page.locator('#expense_type').selectOption('Transport');
      await page.locator('#amount').fill('100');
      await page.locator('#expense_date').fill('2026-09-09');
      const input = page.locator(`#${field}`);
      if (field === 'expense_type') await input.selectOption(value);
      else await input.fill(value);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      expect(await input.evaluate((el, key) => el.validity[key], validity)).toBe(true);
      expect(finance.writes).toHaveLength(0);
      await expect(page.locator('.proc-modal')).toBeVisible();
    });
  }

  test('Other rejects whitespace-only description', async ({ page, finance }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.locator('#expense_type').selectOption('Other');
    await page.locator('#amount').fill('100');
    await page.locator('#expense_date').fill('2026-09-09');
    await page.locator('#description').fill('   ');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText("Description is required when Expense Type is 'Other'", { exact: true })).toBeVisible();
    expect(finance.writes).toHaveLength(0);
  });

  test('optional associations and description can be empty', async ({ page, finance }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.locator('#expense_type').selectOption('Transport');
    await page.locator('#amount').fill('0.01');
    await page.locator('#expense_date').fill('2026-09-09');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Expense created', { exact: true })).toBeVisible();
    expect(finance.writes[0].body).toMatchObject({ amount: '0.01', department_id: null, asset_id: null, description: '' });
  });

  test('asset-linked expense cannot be deleted', async ({ page, finance }) => {
    finance.expenses[0].asset_id = 1;
    await page.goto('/expenses');
    await page.locator('.proc-table tbody tr').first().getByTitle('Delete', { exact: true }).click();
    await expect(page.getByText('Cannot delete this expense because it is linked to an asset.', { exact: true })).toBeVisible();
    expect(finance.writes).toHaveLength(0);
  });
});
