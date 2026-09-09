import { test, expect } from '@playwright/test';
import { restoreSession, setupInventoryApi, gotoAssets } from '../helpers/inventory.helpers.js';
let inventory;
test.beforeEach(async ({ page }) => {
  await restoreSession(page);
  inventory = await setupInventoryApi(page);
});
test.afterEach(() => {
  expect(inventory.unexpected).toEqual([]);
  expect(inventory.mutations, 'Invalid forms must not send mutations').toEqual([]);
});

async function openValidAsset(page) {
  await gotoAssets(page);
  await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
  const modal = page.locator('.proc-modal');
  await modal.locator('#asset_name').fill('Test Equipment');
  await modal.locator('select').first().selectOption('1');
  await modal.locator('#cost').fill('500');
  await modal.locator('#purchase_date').fill('2025-01-01');
  return modal;
}
test.describe('Assets - Required Fields and Dates', () => {
  for (const field of ['asset_name', 'cost', 'purchase_date']) {
    test(field + ' is required', async ({ page }) => {
      const modal = await openValidAsset(page);
      const input = modal.locator('#' + field);
      await input.fill('');
      await modal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect.poll(() => input.evaluate(el => el.validity.valueMissing)).toBe(true);
      await expect(modal).toBeVisible();
    });
  }
  test('department is required', async ({ page }) => {
    const modal = await openValidAsset(page);
    const input = modal.locator('select').first();
    await input.selectOption('');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect.poll(() => input.evaluate(el => el.validity.valueMissing)).toBe(true);
  });
  test('negative cost is rejected', async ({ page }) => {
    const modal = await openValidAsset(page);
    await modal.locator('#cost').fill('-1');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect.poll(() => modal.locator('#cost').evaluate(el => el.validity.rangeUnderflow)).toBe(true);
  });
  test('future purchase date is rejected', async ({ page }) => {
    const modal = await openValidAsset(page);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await modal.locator('#purchase_date').fill(tomorrow);
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect.poll(() => modal.locator('#purchase_date').evaluate(el => el.validity.rangeOverflow)).toBe(true);
  });
  test('Other condition requires custom details', async ({ page }) => {
    const modal = await openValidAsset(page);
    await modal.locator('#condition_type').selectOption('Other');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect.poll(() => modal.locator('#custom_condition').evaluate(el => el.validity.valueMissing)).toBe(true);
  });
});
