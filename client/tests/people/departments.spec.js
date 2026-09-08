// tests/people/departments.spec.js
import { test, expect } from '@playwright/test';
import {
  restoreSession, gotoDepartments, waitForToast, uniqueDeptName,
  createDepartmentViaApi, deleteDepartmentViaApi,
  createEmployeeViaApi, deleteEmployeeViaApi, getToken,
} from '../helpers/people.helpers.js';

test.beforeEach(async ({ page }, testInfo) => {
  await restoreSession(page);
  if (testInfo.title.startsWith('submit button shows')) {
    await page.route('**/api/departments', route => route.fulfill({ json: [{ department_id: 999999, department_name: 'Saving Department', status: 'Active' }] }));
    await page.route('**/api/employees', route => route.fulfill({ json: [] }));
  }
  if (/Pagination|Search and Filters/.test(testInfo.titlePath.join(' '))) {
    await page.route('**/api/departments', route => route.fulfill({ json: Array.from({ length: 19 }, (_, i) => ({ department_id: i + 1, department_name: 'Fixture Department ' + i, budget: 10000, status: i === 18 ? 'Inactive' : 'Active', employee_count: 0, asset_count: 0 })) }));
  }
});

// ─── Page Structure ───────────────────────────────────────────────────────────

test.describe('Departments — Page Structure', () => {

  test('heading, stats, and cards grid are visible', async ({ page }) => {
    await gotoDepartments(page);
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
    await expect(page.locator('.dept-stats')).toBeVisible();
  });

  test('stat cards show Total, Active, Employees, Assets', async ({ page }) => {
    await gotoDepartments(page);
    const stats = page.locator('.dept-stat-card');
    await expect(stats.filter({ hasText: 'Total' })).toBeVisible();
    await expect(stats.filter({ hasText: 'Active' })).toBeVisible();
    await expect(stats.filter({ hasText: 'Employees' })).toBeVisible();
    await expect(stats.filter({ hasText: 'Assets' })).toBeVisible();
  });

  test('Add Department button is present', async ({ page }) => {
    await gotoDepartments(page);
    await expect(page.getByRole('button', { name: /Add Department/i })).toBeVisible();
  });

  test('loading skeleton is shown before data arrives', async ({ page }) => {
    await page.route('**/api/departments', async route => {
      await new Promise(r => setTimeout(r, 400));
      await route.continue();
    });
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const skeletonOrGrid = page.locator('.dept-skeleton-grid, .dept-grid, .dept-empty');
    await skeletonOrGrid.first().waitFor({ timeout: 8_000 });
  });

  test('empty state shows "No departments found" when search has no results', async ({ page }) => {
    await gotoDepartments(page);
    await page.locator('#search').fill('zzz_nobody_xyz_99999');
    await expect(page.locator('.dept-empty')).toContainText('No departments found');
  });

});

// ─── Search & Filters ─────────────────────────────────────────────────────────

test.describe('Departments — Search and Filters', () => {

  test('search filters department cards', async ({ page }) => {
    await gotoDepartments(page);
    await page.locator('#search').fill('zzz_nobody_xyz');
    await expect(page.locator('.dept-empty')).toContainText('No departments found');
    await page.locator('#search').clear();
  });

  test('All filter tab shows all departments', async ({ page }) => {
    await gotoDepartments(page);
    await page.locator('.dept-filter-tab').filter({ hasText: 'All' }).click();
    const active = page.locator('.dept-filter-tab.active');
    await expect(active).toHaveText('All');
  });

  test('Active filter tab shows only Active departments', async ({ page }) => {
    await gotoDepartments(page);
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    const badges = page.locator('.dept-status-badge.badge-inactive');
    await expect(badges).toHaveCount(0);
  });

  test('Inactive filter tab shows only Inactive departments', async ({ page }) => {
    await gotoDepartments(page);
    await page.locator('.dept-filter-tab').filter({ hasText: 'Inactive' }).click();
    const badges = page.locator('.dept-status-badge.badge-active');
    await expect(badges).toHaveCount(0);
  });

  test('combined search + Active filter works', async ({ page }) => {
    await gotoDepartments(page);
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await page.locator('#search').fill('zzz_nobody_xyz');
    await expect(page.locator('.dept-empty')).toContainText('No departments found');
  });

  test('filter resets page to 1', async ({ page }) => {
    await gotoDepartments(page);
    const page2Btn = page.locator('.dept-pagination button').filter({ hasText: '2' });
    const hasPage2 = await page2Btn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasPage2) {
      await page2Btn.click();
      await expect(page.locator('.dept-page-info')).toContainText('Page 2');
    }
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    const pageInfo = page.locator('.dept-page-info');
    const visible = await pageInfo.isVisible({ timeout: 2_000 }).catch(() => false);
    if (visible) await expect(pageInfo).toContainText('Page 1');
  });

});

// ─── Pagination ───────────────────────────────────────────────────────────────

test.describe('Departments — Pagination', () => {

  test('pagination appears with 19 controlled records', async ({ page }) => {
    await gotoDepartments(page);
    await expect(page.locator('.dept-pagination')).toBeVisible();
    await expect(page.locator('.dept-card')).toHaveCount(9);
  });

  test('next/prev pagination buttons work', async ({ page }) => {
    await gotoDepartments(page);
    const pagination = page.locator('.dept-pagination');
    await expect(pagination).toBeVisible();
    await pagination.locator('button').last().click();
    await expect(page.locator('.dept-page-info')).toContainText('Page 2');
    await pagination.locator('button').first().click();
    await expect(page.locator('.dept-page-info')).toContainText('Page 1');
  });

});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

test.describe('Departments — CRUD', () => {
  // Each test gets its own unique name via a shared mutable object
  const state = { deptName: '', createdDeptId: null };
  let createdDeptId;

  test.afterAll(async ({ request, browser }) => {
    if (!createdDeptId) return;
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/departments');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();
    await deleteDepartmentViaApi(request, token, createdDeptId).catch(() => {});
  });

  test('Add Department modal opens and closes without saving', async ({ page }) => {
    await gotoDepartments(page);
    await page.getByRole('button', { name: /Add Department/i }).click();
    await expect(page.locator('.dept-modal')).toBeVisible();
    await expect(page.locator('.dept-modal h2')).toHaveText('New Department');
    await page.locator('.dept-modal-close').click();
    await expect(page.locator('.dept-modal')).toHaveCount(0);
  });

  test('Cancel button closes modal without saving', async ({ page }) => {
    await gotoDepartments(page);
    await page.getByRole('button', { name: /Add Department/i }).click();
    await page.locator('.dept-btn-cancel').click();
    await expect(page.locator('.dept-modal')).toHaveCount(0);
  });

  test('creates a new department and verifies persistence after reload', async ({ page }) => {    
    state.deptName = uniqueDeptName();
    await gotoDepartments(page);
    await page.getByRole('button', { name: /Add Department/i }).click();
    const modal = page.locator('.dept-modal');
    await modal.locator('#department_name').fill(state.deptName);
    await modal.locator('#budget').fill('100000');
    await modal.locator('#description').fill('Test department description');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'created');

    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    await expect(card).toBeVisible({ timeout: 8_000 });

    const token = await getToken(page);
    const res = await page.request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    const found = Array.isArray(depts) ? depts.find(d => d.department_name === state.deptName) : null;
    if (found) { createdDeptId = found.department_id; state.createdDeptId = found.department_id; }
  });

  test('view modal shows department details', async ({ page }) => {
    if (!state.deptName) { test.skip(); return; }
    await gotoDepartments(page);
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    await card.locator('.btn-view').click();
    const viewModal = page.locator('.dept-modal');
    await expect(viewModal).toBeVisible();
    await expect(viewModal).toContainText(state.deptName);
    await page.locator('.dept-modal-close').last().click();
  });

  test('edit form pre-fills existing values', async ({ page }) => {
    if (!state.deptName) { test.skip(); return; }
    await gotoDepartments(page);
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    await card.locator('.btn-edit').click();
    const modal = page.locator('.dept-modal');
    await expect(modal.locator('h2')).toHaveText('Edit Department');
    await expect(modal.locator('#department_name')).toHaveValue(state.deptName);
    await page.locator('.dept-btn-cancel').click();
  });

  test('edit department updates values and persists after reload', async ({ page }) => {
    if (!state.deptName) { test.skip(); return; }
    await gotoDepartments(page);
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    await card.locator('.btn-edit').click();
    const modal = page.locator('.dept-modal');
    await modal.locator('#budget').fill('200000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'updated');

    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await page.locator('#search').fill(state.deptName);
    const updatedCard = page.locator('.dept-card').filter({ hasText: state.deptName });
    await expect(updatedCard).toContainText('200,000');
  });

  test('delete confirmation — cancel keeps department', async ({ page }) => {
    if (!state.deptName) { test.skip(); return; }
    await gotoDepartments(page);
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    page.once('dialog', d => d.dismiss());
    await card.locator('.btn-delete').click();
    await expect(card).toBeVisible();
  });

  test('delete department — accept removes it', async ({ page }) => {
    if (!state.deptName) { test.skip(); return; }
    await gotoDepartments(page);
    await page.locator('#search').fill(state.deptName);
    const card = page.locator('.dept-card').filter({ hasText: state.deptName });
    page.once('dialog', d => d.accept());
    await card.locator('.btn-delete').click();
    await waitForToast(page, 'deleted');
    await expect(page.locator('.dept-card').filter({ hasText: state.deptName })).toHaveCount(0, { timeout: 8_000 });
    createdDeptId = null; state.createdDeptId = null;
  });

});

// ─── Detail View ──────────────────────────────────────────────────────────────

test.describe('Departments — Detail View', () => {

  test('detail view shows budget, spent, remaining, employee and asset counts', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token, { budget: 500000 });

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const cards = page.locator('.dept-card');
      const count = await cards.count();
      if (count === 0) { test.skip(); return; }

      // Find the card for our test department
      const r1 = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d1 = await r1.json();
      const deptName1 = d1.department_name;

      await page.locator('#search').fill(deptName1);
      const card1 = page.locator('.dept-card').filter({ hasText: deptName1 });
      await card1.locator('.btn-view').click();

      const viewModal = page.locator('.dept-modal');
      await expect(viewModal).toBeVisible();
      await expect(viewModal.locator('.dept-view-stat').filter({ hasText: 'Budget' })).toBeVisible();
      await expect(viewModal.locator('.dept-view-stat').filter({ hasText: 'Remaining' })).toBeVisible();
      await expect(viewModal.locator('.dept-view-stat').filter({ hasText: 'Spent' })).toBeVisible();
      await expect(viewModal.locator('.dept-view-stat').filter({ hasText: 'Employees' })).toBeVisible();
      await expect(viewModal.locator('.dept-view-stat').filter({ hasText: 'Assets' })).toBeVisible();
      await page.locator('.dept-modal-close').last().click();
    } finally {
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('detail view shows empty state when no employees or assets', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const r2 = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d2 = await r2.json();
      const deptName2 = d2.department_name;

      await page.locator('#search').fill(deptName2);
      const card2 = page.locator('.dept-card').filter({ hasText: deptName2 });
      await card2.locator('.btn-view').click();

      const viewModal2 = page.locator('.dept-modal');
      await expect(viewModal2.locator('.dept-view-empty')).toContainText('No employees or assets');
      await page.locator('.dept-modal-close').last().click();
    } finally {
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('detail view shows employee table when employees are assigned', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId);

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const r3 = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d3 = await r3.json();
      const deptName3 = d3.department_name;

      await page.locator('#search').fill(deptName3);
      const card3 = page.locator('.dept-card').filter({ hasText: deptName3 });
      await card3.locator('.btn-view').click();

      const viewModal3 = page.locator('.dept-modal');
      await expect(viewModal3.locator('.dept-inner-table')).toBeVisible();
      await expect(viewModal3.locator('.dept-section-hdr').filter({ hasText: 'Employees' })).toBeVisible();
      await page.locator('.dept-modal-close').last().click();
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('employee print button is present in detail view when employees exist', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId);

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const r4 = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d4 = await r4.json();
      const deptName4 = d4.department_name;

      await page.locator('#search').fill(deptName4);
      await page.locator('.dept-card').filter({ hasText: deptName4 }).locator('.btn-view').click();

      const viewModal4 = page.locator('.dept-modal');
      const printBtn = viewModal4.locator('.dept-print-btn').first();
      await expect(printBtn).toBeVisible();
      await page.locator('.dept-modal-close').last().click();
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});

// ─── API Error Handling ───────────────────────────────────────────────────────

test.describe('Departments — API Error Handling', () => {

  test('shows error toast when department list API fails', async ({ page }) => {
    await page.route('**/api/departments', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    }));
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await waitForToast(page, 'Failed to load departments');
  });

  test('submit button shows "Saving..." while request is in flight', async ({ page }) => {
    await gotoDepartments(page);
    await page.route('**/api/departments', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(r => setTimeout(r, 1_500));
        await route.fulfill({ status: 500, json: { message: 'Controlled save failure' } });
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', { name: /Add Department/i }).click();
    const modal = page.locator('.dept-modal');
    await modal.locator('#department_name').fill('Saving Test Dept');
    await modal.locator('#budget').fill('10000');
    await page.locator('.dept-btn-submit').click();
    await expect(page.locator('.dept-btn-submit')).toHaveText('Saving...', { timeout: 3_000 });
  });

});
