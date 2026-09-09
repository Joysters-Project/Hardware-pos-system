import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

test('history refresh recovers when the last page is removed', async ({ page, finance }) => {
  await page.goto('/salary/history');
  await page.locator('.sal-pagination').getByRole('button', { name: '2', exact: true }).click();
  finance.salaries = finance.salaries.slice(0, 12);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.sal-table tbody tr')).toHaveCount(12);
});

test('salary history pagination, employee summary, search and month filter', async ({ page }) => {
  await page.goto('/salary/history?employee_id=1');
  await expect(page.locator('#filterEmp')).toHaveValue('1');
  await expect(page.getByText('Current Salary', { exact: true })).toBeVisible();
  await expect(page.locator('.sal-table tbody tr')).toHaveCount(12);
  await page.locator('.sal-pagination').getByRole('button', { name: '2', exact: true }).click();
  await expect(page.locator('.sal-table tbody tr')).toHaveCount(1);
  await page.locator('#search').fill('Amal');
  await expect(page.locator('.sal-page-info')).toContainText('Page 1');
  await page.locator('#filterMonth').selectOption('8');
  await expect(page.getByText('No salary history found')).toBeVisible();
});

test('/salary/history reports API failure', async ({ page, finance }) => {
  finance.fail = '/salary';
  await page.goto('/salary/history');
  await expect(page.getByText('Failed to load history', { exact: true })).toBeVisible();
});

test.describe('Salary History - Structure, Totals and Filters', () => {
  test('total includes paid records only and payslips exclude pending records', async ({ page }) => {
    await page.goto('/salary/history');
    await expect(page.getByText('Total Paid:', { exact: false })).toContainText('303,000.00');
    await expect(page.locator('.sal-table th')).toHaveCount(11);
    await expect(page.getByTitle('View Payslip', { exact: true })).toHaveCount(6);
    await expect(page.locator('.sal-table tbody tr').first().getByTitle('View Payslip', { exact: true })).toHaveCount(0);
  });

  test('empty dataset hides pagination and total bar', async ({ page, finance }) => {
    finance.salaries = [];
    await page.goto('/salary/history');
    await expect(page.getByText('No salary history found', { exact: true })).toBeVisible();
    await expect(page.locator('.sal-pagination')).toHaveCount(0);
    await expect(page.getByText('Total Paid:', { exact: false })).toHaveCount(0);
  });

  test('clearing employee filter hides employee summary', async ({ page }) => {
    await page.goto('/salary/history?employee_id=1');
    await expect(page.getByText('Current Salary', { exact: true })).toBeVisible();
    await page.locator('#filterEmp').selectOption('');
    await expect(page.getByText('Current Salary', { exact: true })).toHaveCount(0);
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(12);
  });

  test('employee with no payments shows an empty table', async ({ page }) => {
    await page.goto('/salary/history');
    await page.locator('#filterEmp').selectOption('2');
    await expect(page.getByText('No salary history found', { exact: true })).toBeVisible();
  });

  test('year filter excludes records from other years', async ({ page }) => {
    await page.goto('/salary/history');
    await page.locator('#filterYear').selectOption('2025');
    await expect(page.getByText('No salary history found', { exact: true })).toBeVisible();
    await page.locator('#filterYear').selectOption('2026');
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(12);
  });

  test('blocked payslip popup shows feedback', async ({ page }) => {
    await page.goto('/salary/history');
    await expect(page.getByTitle('View Payslip', { exact: true })).toHaveCount(6);
    await page.evaluate(() => { window.open = () => null; });
    await page.getByTitle('View Payslip', { exact: true }).first().click();
    await expect(page.getByText('Popup blocked. Please allow popups to view the payslip.', { exact: true })).toBeVisible();
  });
});
