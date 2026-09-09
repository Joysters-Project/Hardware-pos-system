import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

for (const category of ['monthly', 'daily']) {
  test(`create ${category} salary with employee selection and calculation`, async ({ page, finance }) => {
    await page.goto('/salary');
    await page.getByRole('button', { name: 'New Record' }).click();
    await expect(page.getByRole('button', { name: 'Pay Salary', exact: true })).toBeDisabled();
    const input = page.getByPlaceholder('Type employee name and select');
    await input.fill(category === 'monthly' ? 'Amal' : 'Nimal');
    await input.press('ArrowDown');
    await input.press('Enter');
    if (category === 'monthly') await page.locator('#payment_month').selectOption('9');
    else await expect(page.locator('#payment_month')).toHaveCount(0);
    await page.locator('#bonus_amount').fill('1000');
    await page.locator('#deduction_amount').fill('500');
    await expect(page.locator('.sal-final-preview')).toHaveText(category === 'monthly' ? 'LKR 50,500' : 'LKR 3,000');
    await page.getByRole('button', { name: 'Pay Salary', exact: true }).click();
    await expect(page.getByText('Salary recorded as pending!')).toBeVisible();
    expect(finance.writes[0].body.salary_category).toBe(category);
    expect(finance.writes[0].body.employee_id).toBe(category === 'monthly' ? '1' : '2');
  });
}

test('salary edit clearly identifies update and saves changes', async ({ page, finance }) => {
  await page.goto('/salary');
  await page.getByTitle('Edit Salary', { exact: true }).first().click();
  await expect(page.locator('.sal-modal h2')).toHaveText('Edit Salary Payment');
  await page.locator('#bonus_amount').fill('2000');
  await page.getByRole('button', { name: 'Update Salary', exact: true }).click();
  await expect(page.getByText('Salary record updated successfully!')).toBeVisible();
  expect(finance.writes[0]).toMatchObject({ method: 'PUT', path: '/salary/1', body: { bonus_amount: '2000' } });
});

test('mark pending salary as paid updates available actions', async ({ page, finance }) => {
  await page.goto('/salary');
  const row = page.locator('.sal-table tbody tr').first();
  await row.getByTitle('Mark as paid', { exact: true }).click();
  await expect(row.locator('.sal-status-pill')).toHaveText('Paid');
  await expect(row.getByTitle('View Payslip', { exact: true })).toBeVisible();
  expect(finance.writes[0].path).toBe('/salary/1/pay');
});

test('salary deletion recovers the previous page', async ({ page, finance }) => {
  finance.salaries = finance.salaries.slice(0, 11);
  await page.goto('/salary');
  await page.locator('.sal-pagination').getByRole('button', { name: '2', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByTitle('Delete Salary', { exact: true }).click();
  await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
  expect(finance.writes[0]).toMatchObject({ method: 'DELETE', path: '/salary/11' });
});

test('/salary reports API failure', async ({ page, finance }) => {
  finance.fail = '/salary';
  await page.goto('/salary');
  await expect(page.getByText('Failed to load salary data', { exact: true })).toBeVisible();
});


test.describe('Salary Management - Page Structure and Modal Behavior', () => {
  test('heading, column headers and first-page controls are visible', async ({ page }) => {
    await page.goto('/salary');
    await expect(page.getByRole('heading', { name: 'Salary Management', exact: true })).toBeVisible();
    await expect(page.locator('.sal-table th')).toHaveCount(11);
    await expect(page.locator('.sal-pagination button').first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeVisible();
  });

  test('empty dataset shows empty message and no pagination', async ({ page, finance }) => {
    finance.salaries = [];
    await page.goto('/salary');
    await expect(page.getByText('No salary records found', { exact: true })).toBeVisible();
    await expect(page.locator('.sal-pagination')).toHaveCount(0);
  });

  test('cancel discards form values before reopening', async ({ page, finance }) => {
    await page.goto('/salary');
    await page.getByRole('button', { name: 'New Record' }).click();
    await page.locator('#remarks').fill('Unsaved note');
    await page.locator('.sal-modal').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('.sal-modal')).toHaveCount(0);
    await page.getByRole('button', { name: 'New Record' }).click();
    await expect(page.locator('#remarks')).toHaveValue('');
    expect(finance.writes).toHaveLength(0);
  });

  test('close icon dismisses the add modal', async ({ page, finance }) => {
    await page.goto('/salary');
    await page.getByRole('button', { name: 'New Record' }).click();
    await page.locator('.sal-modal-close').click();
    await expect(page.locator('.sal-modal')).toHaveCount(0);
    expect(finance.writes).toHaveLength(0);
  });

  test('declining deletion keeps the record', async ({ page, finance }) => {
    await page.goto('/salary');
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('.sal-table tbody tr').first().getByTitle('Delete Salary', { exact: true }).click();
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
    expect(finance.writes).toHaveLength(0);
  });

  test('delete API failure retains the record and displays the server error', async ({ page, finance }) => {
    await page.goto('/salary');
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
    finance.fail = '/salary/1';
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.sal-table tbody tr').first().getByTitle('Delete Salary', { exact: true }).click();
    await expect(page.getByText('Test service unavailable', { exact: true })).toBeVisible();
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
    expect(finance.salaries[0].salary_payment_id).toBe(1);
  });

  test('blocked print popup displays an actionable error', async ({ page }) => {
    await page.goto('/salary');
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
    await page.evaluate(() => { window.open = () => null; });
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
    await expect(page.getByText('Allow pop-ups to print the report', { exact: true })).toBeVisible();
  });
});

test.describe('Salary Management - Filters and Payment Failures', () => {
  for (const status of ['Pending', 'Paid']) {
    test(`${status} filter returns only matching salaries`, async ({ page }) => {
      await page.goto('/salary');
      await page.locator('#filterStatus').selectOption(status);
      await expect(page.locator('.sal-status-pill')).toHaveCount(status === 'Paid' ? 6 : 7);
      await expect(page.locator('.sal-status-pill')).toHaveText(Array(status === 'Paid' ? 6 : 7).fill(status));
    });
  }

  test('daily category filter excludes monthly records', async ({ page }) => {
    await page.goto('/salary');
    await page.locator('#filterCat').selectOption('daily');
    await expect(page.getByText('No salary records found', { exact: true })).toBeVisible();
    await page.locator('#filterCat').selectOption('monthly');
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
  });

  test('unknown employee search shows no results and clearing restores records', async ({ page }) => {
    await page.goto('/salary');
    await page.locator('#search').fill('Nobody');
    await expect(page.getByText('No salary records found', { exact: true })).toBeVisible();
    await page.locator('#search').clear();
    await expect(page.locator('.sal-table tbody tr')).toHaveCount(10);
  });

  test('payment failure leaves salary pending and allows retry', async ({ page, finance }) => {
    await page.goto('/salary');
    const row = page.locator('.sal-table tbody tr').first();
    await expect(row.locator('.sal-status-pill')).toHaveText('Pending');
    finance.fail = '/salary/1/pay';
    await row.getByTitle('Mark as paid', { exact: true }).click();
    await expect(page.getByText('Test service unavailable', { exact: true })).toBeVisible();
    await expect(row.locator('.sal-status-pill')).toHaveText('Pending');
    await expect(row.getByTitle('Mark as paid', { exact: true })).toBeEnabled();
    finance.fail = '';
    await row.getByTitle('Mark as paid', { exact: true }).click();
    await expect(row.locator('.sal-status-pill')).toHaveText('Paid');
  });
});
