import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

test('expenses search, filters and pagination', async ({ page }) => {
  await page.goto('/expenses');
  await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
  await page.locator('.proc-pagination').getByRole('button', { name: '2', exact: true }).click();
  await expect(page.locator('.proc-table tbody tr')).toHaveCount(1);
  await page.locator('#search').fill('Expense 1');
  await expect(page.locator('.proc-table tbody tr')).toHaveCount(3);
  await page.locator('#filterType').selectOption('Transport');
  await expect(page.locator('.proc-table tbody tr')).toHaveCount(1);
  await page.locator('#filterDept').selectOption('1');
  await expect(page.locator('.proc-table')).toContainText('Expense 10');
  await page.locator('#search').fill('missing');
  await expect(page.getByText('No expenses found')).toBeVisible();
});

test('expense create, view, edit and delete persist across reload', async ({ page, finance }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'Add Expense' }).click();
  await page.locator('#expense_type').selectOption('Other');
  await page.locator('#amount').fill('125.50');
  await page.locator('#expense_date').fill('2026-09-09');
  await page.locator('#description').fill('Browser expense');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Expense created', { exact: true })).toBeVisible();
  await page.reload();
  await page.locator('#search').fill('Browser expense');
  const row = page.locator('.proc-table tbody tr');
  await row.getByTitle('View', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expense Details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await row.getByTitle('Edit', { exact: true }).click();
  await page.locator('#amount').fill('200');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(row).toContainText('LKR 200');
  page.once('dialog', dialog => dialog.accept());
  await row.getByTitle('Delete', { exact: true }).click();
  await expect(page.getByText('No expenses found')).toBeVisible();
  expect(finance.writes.map(w => w.method)).toEqual(['POST', 'PUT', 'DELETE']);
});

test('deleting last expense on page returns to remaining records', async ({ page }) => {
  await page.goto('/expenses');
  await page.locator('.proc-pagination').getByRole('button', { name: '2', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.proc-table tbody tr').getByTitle('Delete', { exact: true }).click();
  await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
});

test('/expenses reports API failure', async ({ page, finance }) => {
  finance.fail = '/expenses';
  await page.goto('/expenses');
  await expect(page.getByText('Failed to load expenses', { exact: true })).toBeVisible();
});


test.describe('Expenses - Page Structure and Modal Behavior', () => {
  test('heading, column headers and first-page controls are visible', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
    await expect(page.locator('.proc-table th')).toHaveCount(8);
    await expect(page.locator('.proc-pagination button').first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeVisible();
  });

  test('empty dataset shows empty message and no pagination', async ({ page, finance }) => {
    finance.expenses = [];
    await page.goto('/expenses');
    await expect(page.getByText('No expenses found', { exact: true })).toBeVisible();
    await expect(page.locator('.proc-pagination')).toHaveCount(0);
  });

  test('cancel discards form values before reopening', async ({ page, finance }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.locator('#description').fill('Unsaved note');
    await page.locator('.proc-modal').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('.proc-modal')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.locator('#description')).toHaveValue('');
    expect(finance.writes).toHaveLength(0);
  });

  test('close icon dismisses the add modal', async ({ page, finance }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.locator('.proc-modal-close').click();
    await expect(page.locator('.proc-modal')).toHaveCount(0);
    expect(finance.writes).toHaveLength(0);
  });

  test('declining deletion keeps the record', async ({ page, finance }) => {
    await page.goto('/expenses');
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('.proc-table tbody tr').first().getByTitle('Delete', { exact: true }).click();
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
    expect(finance.writes).toHaveLength(0);
  });

  test('delete API failure retains the record and displays the server error', async ({ page, finance }) => {
    await page.goto('/expenses');
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
    finance.fail = '/expenses/1';
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.proc-table tbody tr').first().getByTitle('Delete', { exact: true }).click();
    await expect(page.getByText('Test service unavailable', { exact: true })).toBeVisible();
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
    expect(finance.expenses[0].expense_id).toBe(1);
  });

  test('blocked print popup displays an actionable error', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(10);
    await page.evaluate(() => { window.open = () => null; });
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
    await expect(page.getByText('Allow pop-ups to print the report', { exact: true })).toBeVisible();
  });
});
