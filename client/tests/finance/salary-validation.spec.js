import { test, expect } from '../helpers/finance.helpers.js';

test.beforeEach(async ({ finance }) => { expect(finance).toBeTruthy(); });

test('salary dates use local calendar boundaries', async ({ page }) => {
  await page.goto('/salary');
  await page.getByRole('button', { name: 'New Record' }).click();
  const date = page.locator('.sal-modal input[type=date]');
  await expect(date).toHaveValue('2026-09-09');
  await expect(date).toHaveAttribute('min', '2026-09-01');
  await expect(date).toHaveAttribute('max', '2026-09-30');
});

test('negative final salary is rejected without a write', async ({ page, finance }) => {
  await page.goto('/salary');
  await page.getByRole('button', { name: 'New Record' }).click();
  const input = page.getByPlaceholder('Type employee name and select');
  await input.fill('Amal');
  await input.press('ArrowDown');
  await input.press('Enter');
  await page.locator('#payment_month').selectOption('9');
  await page.locator('#deduction_amount').fill('60000');
  await page.getByRole('button', { name: 'Pay Salary', exact: true }).click();
  await expect(page.getByText('Final salary cannot be negative.', { exact: true })).toBeVisible();
  expect(finance.writes).toHaveLength(0);
});

test.describe('Salary Validation - Required Fields and Numeric Boundaries', () => {
  for (const [selector, value, validity] of [['#payment_month', '', 'valueMissing'], ['.sal-modal input[type=date]', '', 'valueMissing'], ['.sal-modal input[type=date]', '2026-08-31', 'rangeUnderflow'], ['.sal-modal input[type=date]', '2026-10-01', 'rangeOverflow'], ['#bonus_amount', '-1', 'rangeUnderflow'], ['#deduction_amount', '-1', 'rangeUnderflow'], ['#bonus_amount', '1.001', 'stepMismatch'], ['.sal-modal input[type=number]', '', 'valueMissing']]) {
    test(`${selector} rejects ${value || 'empty'} input`, async ({ page, finance }) => {
      await page.goto('/salary');
      await page.getByRole('button', { name: 'New Record' }).click();
      const employee = page.getByPlaceholder('Type employee name and select');
      await employee.fill('Amal');
      await employee.press('ArrowDown');
      await employee.press('Enter');
      await page.locator('#payment_month').selectOption('9');
      const input = page.locator(selector).first();
      if (selector === '#payment_month') await input.selectOption(value);
      else await input.fill(value);
      await page.getByRole('button', { name: 'Pay Salary', exact: true }).click();
      expect(await input.evaluate((el, key) => el.validity[key], validity)).toBe(true);
      expect(finance.writes).toHaveLength(0);
    });
  }

  test('typing an unselected employee prevents submission', async ({ page, finance }) => {
    await page.goto('/salary');
    await page.getByRole('button', { name: 'New Record' }).click();
    await page.getByPlaceholder('Type employee name and select').fill('Amal');
    await expect(page.getByRole('button', { name: 'Pay Salary', exact: true })).toBeDisabled();
    expect(finance.writes).toHaveLength(0);
  });

  test('changing employee text clears the previous selection', async ({ page }) => {
    await page.goto('/salary');
    await page.getByRole('button', { name: 'New Record' }).click();
    const employee = page.getByPlaceholder('Type employee name and select');
    await employee.fill('Amal');
    await employee.press('ArrowDown');
    await employee.press('Enter');
    await expect(page.getByRole('button', { name: 'Pay Salary', exact: true })).toBeEnabled();
    await employee.fill('Unknown');
    await expect(page.getByRole('button', { name: 'Pay Salary', exact: true })).toBeDisabled();
  });
});
