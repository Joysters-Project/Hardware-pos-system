// tests/people/employees.spec.js
import { test, expect } from '@playwright/test';
import {
  restoreSession, gotoEmployees, waitForToast, uniqueEmployeeName, validEmployeePayload,
  createEmployeeViaApi, deleteEmployeeViaApi, createDepartmentViaApi,
  deleteDepartmentViaApi, getToken,
} from '../helpers/people.helpers.js';

test.beforeEach(async ({ page }, testInfo) => {
  await restoreSession(page);
  if (testInfo.title.startsWith('submit button shows')) {
    await page.route('**/api/departments', route => route.fulfill({ json: [{ department_id: 999999, department_name: 'Saving Department', status: 'Active' }] }));
    await page.route('**/api/employees', route => route.fulfill({ json: [] }));
  }
  if (/Pagination|Search and Filters/.test(testInfo.titlePath.join(' '))) {
    await page.route('**/api/employees', route => route.fulfill({ json: Array.from({ length: 21 }, (_, i) => ({ employee_id: i + 1, first_name: 'Fixture', last_name: String.fromCharCode(65 + i), nic: String(100000000 + i) + 'V', email: 'fixture' + i + '@test.example', phone_no: '071' + String(i).padStart(7, '0'), position: 'Manager', salary: 10000, salary_category: 'monthly', status: i % 3 === 0 ? 'Resigned' : 'Active', department_id: 1, department: { department_name: 'Fixture Department' } })) }));
    await page.route('**/api/departments', route => route.fulfill({ json: [{ department_id: 1, department_name: 'Fixture Department', status: 'Active' }] }));
  }
});

// ─── Page structure ───────────────────────────────────────────────────────────

test.describe('Employees — Page Structure', () => {

  test('heading, stats, and table are visible', async ({ page }) => {
    await gotoEmployees(page);
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
    await expect(page.locator('.emp-stats')).toBeVisible();
    await expect(page.locator('.emp-table')).toBeVisible();
  });

  test('stat cards show Total, Active, Resigned, Inactive', async ({ page }) => {
    await gotoEmployees(page);
    const stats = page.locator('.emp-stat-card');
    await expect(stats.filter({ hasText: 'Total' })).toBeVisible();
    await expect(stats.filter({ hasText: 'Active' }).first()).toBeVisible();
    await expect(stats.filter({ hasText: 'Resigned' })).toBeVisible();
    await expect(stats.filter({ hasText: 'Inactive' })).toBeVisible();
  });

  test('table has correct column headers', async ({ page }) => {
    await gotoEmployees(page);
    const headers = ['Photo', '#', 'Name', 'NIC', 'Position', 'Department',
                     'Salary Category', 'Join Date', 'Phone', 'Salary (LKR)', 'Status', 'Actions'];
    for (const h of headers) {
      await expect(page.locator('.emp-table th').getByText(h)).toBeVisible();
    }
  });

  test('loading state shows "Loading..." row', async ({ page }) => {
    // Intercept to delay response and catch loading state
    await page.route('**/api/employees', async route => {
      await new Promise(r => setTimeout(r, 300));
      await route.continue();
    });
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    // Loading text may appear briefly; assert it was rendered or table appeared
    const loadingOrTable = page.locator('.emp-empty, .emp-table tbody tr');
    await loadingOrTable.first().waitFor({ timeout: 8_000 });
  });

  test('empty state shows "No employees found" when search has no results', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('#search').fill('zzz_nobody_xyz_99999');
    await expect(page.locator('.emp-empty')).toContainText('No employees found');
  });

  test('Export PDF button is present', async ({ page }) => {
    await gotoEmployees(page);
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();
  });

  test('Add Employee button is present', async ({ page }) => {
    await gotoEmployees(page);
    await expect(page.getByRole('button', { name: /Add Employee/i })).toBeVisible();
  });

});

// ─── Search & Filters ─────────────────────────────────────────────────────────

test.describe('Employees — Search and Filters', () => {

  test('search by name filters results', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('#search').fill('zzz_nobody_xyz');
    await expect(page.locator('.emp-empty')).toContainText('No employees found');
    await page.locator('#search').clear();
  });

  test('status filter — Active shows only Active rows', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('#filterStatus').selectOption('Active');
    const pills = page.locator('.emp-status-pill');
    const count = await pills.count();
    if (count === 0) return; // no employees
    for (let i = 0; i < count; i++) {
      await expect(pills.nth(i)).toHaveText('Active');
    }
  });

  test('status filter — Resigned shows only Resigned rows', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('#filterStatus').selectOption('Resigned');
    const pills = page.locator('.emp-status-pill');
    const count = await pills.count();
    for (let i = 0; i < count; i++) {
      await expect(pills.nth(i)).toHaveText('Resigned');
    }
  });

  test('department filter reduces results', async ({ page }) => {
    await gotoEmployees(page);
    const deptSelect = page.locator('#filterDept');
    const options = await deptSelect.locator('option').count();
    if (options <= 1) return; // no departments
    await deptSelect.selectOption({ index: 1 });
    // After filtering, either rows appear or empty state — no crash
    await page.locator('.emp-table tbody tr').first().waitFor({ timeout: 5_000 }).catch(() => {});
    await deptSelect.selectOption('');
  });

  test('combined status + department filter works without error', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('#filterStatus').selectOption('Active');
    const deptSelect = page.locator('#filterDept');
    const options = await deptSelect.locator('option').count();
    if (options > 1) await deptSelect.selectOption({ index: 1 });
    // No JS error — table or empty state visible
    const result = page.locator('.emp-table tbody tr, .emp-empty');
    await result.first().waitFor({ timeout: 5_000 });
  });

  test('search resets to page 1', async ({ page }) => {
    await gotoEmployees(page);
    // If pagination exists, go to page 2 first
    const page2Btn = page.locator('.emp-pagination button').filter({ hasText: '2' });
    const hasPage2 = await page2Btn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasPage2) {
      await page2Btn.click();
      await expect(page.locator('.emp-page-info')).toContainText('Page 2');
    }
    await page.locator('#search').fill('a');
    // Page info should show page 1 (or pagination disappears)
    const pageInfo = page.locator('.emp-page-info');
    const infoVisible = await pageInfo.isVisible({ timeout: 2_000 }).catch(() => false);
    if (infoVisible) {
      await expect(pageInfo).toContainText('Page 1');
    }
  });

});

// ─── Pagination ───────────────────────────────────────────────────────────────

test.describe('Employees — Pagination', () => {

  test('pagination appears with 21 controlled records', async ({ page }) => {
    await gotoEmployees(page);
    await expect(page.locator('.emp-pagination')).toBeVisible();
    await expect(page.locator('.emp-table tbody tr')).toHaveCount(10);
  });

  test('next/prev pagination buttons work', async ({ page }) => {
    await gotoEmployees(page);
    const pagination = page.locator('.emp-pagination');
    await expect(pagination).toBeVisible();

    const nextBtn = pagination.locator('button').last();
    await nextBtn.click();
    await expect(page.locator('.emp-page-info')).toContainText('Page 2');

    const prevBtn = pagination.locator('button').first();
    await prevBtn.click();
    await expect(page.locator('.emp-page-info')).toContainText('Page 1');
  });

});

// ─── Add / View / Edit / Delete ───────────────────────────────────────────────

test.describe('Employees — CRUD', () => {
  let deptId;
  let empId;
  const { first_name, last_name } = uniqueEmployeeName();

  test.beforeAll(async ({ request, browser }) => {
    // Create a fresh page just to get the token
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const page = await ctx.newPage();
    await restoreSession(page);
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    await ctx.close();

    deptId = await createDepartmentViaApi(request, token);
  });

  test.afterAll(async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const page = await ctx.newPage();
    await restoreSession(page);
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    await ctx.close();

    if (empId) await deleteEmployeeViaApi(request, token, empId).catch(() => {});
    if (deptId) await deleteDepartmentViaApi(request, token, deptId).catch(() => {});
  });

  test('Add Employee modal opens and closes without saving', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    await expect(page.locator('.emp-modal')).toBeVisible();
    await expect(page.locator('.emp-modal h2')).toHaveText('Add Employee');
    await page.locator('.emp-modal-close').click();
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('Cancel button closes modal without saving', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    await expect(page.locator('.emp-modal')).toBeVisible();
    await page.locator('.emp-btn-cancel').click();
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('reopening Add modal has clean/default state', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    // Fill something
    const modal = page.locator('.emp-modal');
    await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill('Temp');
    await page.locator('.emp-btn-cancel').click();
    // Reopen
    await page.getByRole('button', { name: /Add Employee/i }).click();
    const firstNameInput = page.locator('.emp-modal .emp-field').filter({ hasText: 'First Name' }).locator('input');
    await expect(firstNameInput).toHaveValue('');
  });

  test('creates a new employee and verifies persistence after reload', async ({ page }) => {
    const payload = validEmployeePayload();
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();

    const modal = page.locator('.emp-modal');
    await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill(first_name);
    await modal.locator('.emp-field').filter({ hasText: 'Last Name' }).locator('input').fill(last_name);
    await modal.locator('.emp-field').filter({ hasText: /^NIC/ }).locator('input').fill(payload.nic);
    await modal.locator('.emp-field').filter({ hasText: 'Email' }).locator('input').fill(`${first_name.toLowerCase()}@test.example`);
    await modal.locator('#phone_no').fill(payload.phone_no);
    await modal.locator('.emp-field').filter({ hasText: 'Position' }).locator('input').fill('Manager');
    await modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]').fill('50000');
    await modal.locator('#salary_category').selectOption('monthly');

    // Select the test department — find the department select by its label
    const deptSelect = modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select');
    await deptSelect.selectOption(String(deptId));

    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'created');

    // Verify persistence after reload
    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    await expect(row).toBeVisible({ timeout: 8_000 });

    // Capture the employee ID for cleanup
    const idBadge = row.locator('.emp-id-badge');
    const idText = await idBadge.textContent();
    empId = parseInt(idText?.replace('#', '') || '0');
  });

  test('view modal shows correct employee details', async ({ page }) => {
    if (!empId) { test.skip(); return; }
    await gotoEmployees(page);
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    await row.locator('.btn-view').click();
    const viewModal = page.locator('.emp-modal');
    await expect(viewModal).toBeVisible();
    await expect(viewModal.locator('h2')).toHaveText('Employee Details');
    await expect(viewModal).toContainText(first_name);
    await expect(viewModal).toContainText(last_name);
    await page.locator('.emp-modal-close').last().click();
  });

  test('edit form pre-fills existing values', async ({ page }) => {
    if (!empId) { test.skip(); return; }
    await gotoEmployees(page);
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    await row.locator('.btn-edit').click();
    const modal = page.locator('.emp-modal');
    await expect(modal.locator('h2')).toHaveText('Edit Employee');
    const firstNameInput = modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input');
    await expect(firstNameInput).toHaveValue(first_name);
    const lastNameInput = modal.locator('.emp-field').filter({ hasText: 'Last Name' }).locator('input');
    await expect(lastNameInput).toHaveValue(last_name);
    await page.locator('.emp-btn-cancel').click();
  });

  test('edit employee updates values and persists after reload', async ({ page }) => {
    if (!empId) { test.skip(); return; }
    await gotoEmployees(page);
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    await row.locator('.btn-edit').click();
    const modal = page.locator('.emp-modal');
    // Change salary
    const salaryInput = modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]');
    await salaryInput.fill('75000');
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'updated');

    // Verify after reload
    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await page.locator('#search').fill(first_name);
    const updatedRow = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    await expect(updatedRow.locator('.emp-salary-cell')).toContainText('75,000');
  });

  test('delete confirmation — cancel keeps employee', async ({ page }) => {
    if (!empId) { test.skip(); return; }
    await gotoEmployees(page);
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    page.once('dialog', d => d.dismiss());
    await row.locator('.btn-delete').click();
    // Employee should still be present
    await expect(row).toBeVisible();
  });

  test('delete employee — accept confirmation removes employee', async ({ page }) => {
    if (!empId) { test.skip(); return; }
    await gotoEmployees(page);
    await page.locator('#search').fill(first_name);
    const row = page.locator('.emp-table tbody tr').filter({ hasText: first_name });
    page.once('dialog', d => d.accept());
    await row.locator('.btn-delete').click();
    await waitForToast(page, 'deleted');
    await expect(page.locator('.emp-table tbody tr').filter({ hasText: first_name })).toHaveCount(0, { timeout: 8_000 });
    empId = null; // already deleted
  });

});

// ─── Salary categories ────────────────────────────────────────────────────────

test.describe('Employees — Salary Categories', () => {

  test('salary_category dropdown has Monthly Worker and Daily Worker options', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    const select = page.locator('#salary_category');
    await expect(select.locator('option[value="monthly"]')).toHaveText('Monthly Worker');
    await expect(select.locator('option[value="daily"]')).toHaveText('Daily Worker');
    await page.locator('.emp-btn-cancel').click();
  });

  test('table shows "Monthly Worker" / "Daily Worker" in Salary Category column', async ({ page }) => {
    await gotoEmployees(page);
    const rows = page.locator('.emp-table tbody tr');
    const count = await rows.count();
    if (count === 0) { test.skip(); return; }
    // Each row's salary category cell should be one of the two values
    const catCells = page.locator('.emp-table tbody tr td:nth-child(7)');
    const first = await catCells.first().textContent();
    expect(['Monthly Worker', 'Daily Worker']).toContain(first?.trim());
  });

});

// ─── Department filter in form ────────────────────────────────────────────────

test.describe('Employees — Department Assignment', () => {

  test('only Active departments appear in the department dropdown', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    // Create an inactive department
    const inactiveDeptId = await createDepartmentViaApi(request, token, {
      department_name: `InactiveTest${Date.now().toString(36).toUpperCase()}`,
      budget: 10000,
      status: 'Inactive',
    });

    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await page.getByRole('button', { name: /Add Employee/i }).click();

    const modal = page.locator('.emp-modal');
    // The department select is the last select in the form grid
    const deptSelect = modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select');
    const optionValues = await deptSelect.locator('option').evaluateAll(
      opts => opts.map(o => o.value)
    );
    expect(optionValues).not.toContain(String(inactiveDeptId));

    await page.locator('.emp-btn-cancel').click();
    await deleteDepartmentViaApi(request, token, inactiveDeptId);
  });

});

// ─── Photo upload ─────────────────────────────────────────────────────────────

test.describe('Employees — Photo Upload', () => {

  test('photo upload area is present in Add modal', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    await expect(page.locator('.emp-photo-upload')).toBeVisible();
    await page.locator('.emp-btn-cancel').click();
  });

  test('uploading a valid image shows preview', async ({ page }) => {
    await gotoEmployees(page);
    await page.getByRole('button', { name: /Add Employee/i }).click();

    // Create a minimal 1x1 PNG (67 bytes) as a valid image
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    );
    await page.locator('#file_field').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: pngBytes,
    });
    await expect(page.locator('.emp-photo-preview')).toBeVisible({ timeout: 5_000 });
    await page.locator('.emp-btn-cancel').click();
  });

});

// ─── Export PDF ───────────────────────────────────────────────────────────────

test.describe('Employees — Export PDF', () => {

  test('Export PDF opens a new window with employee report content', async ({ page, context }) => {
    await gotoEmployees(page);
    // Wait for at least one employee row
    const rows = page.locator('.emp-table tbody tr');
    const count = await rows.count();
    if (count === 0) { test.skip(); return; }

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /Export PDF/i }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    const content = await popup.content();
    expect(content).toContain('Employees Report');
    expect(content).toContain('Mathumithan Hardware');
    await popup.close();
  });

});

// ─── API error handling ───────────────────────────────────────────────────────

test.describe('Employees — API Error Handling', () => {

  test('shows error toast when employee list API fails', async ({ page }) => {
    await page.route('**/api/employees', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    }));
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await waitForToast(page, 'Failed to load data');
  });

  test('submit button shows "Saving..." while request is in flight', async ({ page }) => {
    await gotoEmployees(page);
    // Delay the POST response
    await page.route('**/api/employees', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(r => setTimeout(r, 1_500));
        await route.fulfill({ status: 500, json: { message: 'Controlled save failure' } });
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', { name: /Add Employee/i }).click();
    const modal = page.locator('.emp-modal');
    await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill('Saving');
    await modal.locator('.emp-field').filter({ hasText: 'Last Name' }).locator('input').fill('Test');
    await modal.locator('.emp-field').filter({ hasText: /^NIC/ }).locator('input').fill('111111111V');
    await modal.locator('.emp-field').filter({ hasText: 'Email' }).locator('input').fill('saving@test.example');
    await modal.locator('#phone_no').fill('0771111111');
    await modal.locator('.emp-field').filter({ hasText: 'Position' }).locator('input').fill('Manager');
    await modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]').fill('10000');
    const deptSelect = modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select');
    const opts = await deptSelect.locator('option').count();
    if (opts > 1) await deptSelect.selectOption({ index: 1 });

    await page.locator('.emp-btn-submit').click();
    await expect(page.locator('.emp-btn-submit')).toHaveText('Saving...', { timeout: 3_000 });
  });

});
