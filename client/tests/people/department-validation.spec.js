// tests/people/department-validation.spec.js
import { test, expect } from '@playwright/test';
import {
  restoreSession, gotoDepartments, waitForToast, uniqueDeptName,
  createDepartmentViaApi, deleteDepartmentViaApi,
  createEmployeeViaApi, deleteEmployeeViaApi, getToken,
} from '../helpers/people.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

async function openAddModal(page) {
  await gotoDepartments(page);
  await page.getByRole('button', { name: /Add Department/i }).click();
  return page.locator('.dept-modal');
}

// ─── Name Validation ──────────────────────────────────────────────────────────

test.describe('Department Validation — Name Rules', () => {

  test('empty name shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#budget').fill('10000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'Department name is required');
  });

  test('whitespace-only name shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#department_name').fill('   ');
    await modal.locator('#budget').fill('10000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'Department name is required');
  });

  test('valid name with letters and spaces is accepted', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    const modal = await openAddModal(page);
    const name = uniqueDeptName();
    await modal.locator('#department_name').fill(name);
    await modal.locator('#budget').fill('10000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'created');

    const res = await request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    const found = depts.find(d => d.department_name === name);
    if (found) await deleteDepartmentViaApi(request, token, found.department_id);
  });

  test('backend rejects name with special characters', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/departments');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();

    const res = await request.post('/api/departments', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { department_name: 'Sales@HQ!', budget: 10000, status: 'Active' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/letters|numbers|spaces/i);
  });

  test('backend rejects duplicate department name', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/departments');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();

    const name = uniqueDeptName();
    const deptId = await createDepartmentViaApi(request, token, { department_name: name });
    try {
      const r2 = await request.post('/api/departments', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { department_name: name, budget: 20000, status: 'Active' },
      });
      expect(r2.status()).toBe(400);
      const body = await r2.json();
      expect(body.message).toMatch(/already exists/i);
    } finally {
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});

// ─── Budget Validation ────────────────────────────────────────────────────────

test.describe('Department Validation — Budget Rules', () => {

  test('empty budget shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#department_name').fill(uniqueDeptName());
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'Budget must be greater than 0');
  });

  test('zero budget shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#department_name').fill(uniqueDeptName());
    await modal.locator('#budget').fill('0');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'Budget must be greater than 0');
  });

  test('negative budget is blocked by native validation', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#department_name').fill(uniqueDeptName());
    await modal.locator('#budget').fill('-500');
    await page.locator('.dept-btn-submit').click();
    expect(await modal.locator('#budget').evaluate(el => el.validity.rangeUnderflow)).toBe(true);
    await expect(modal).toBeVisible();
  });

  test('positive budget is accepted', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    const modal = await openAddModal(page);
    const name = uniqueDeptName();
    await modal.locator('#department_name').fill(name);
    await modal.locator('#budget').fill('50000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'created');

    const res = await request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    const found = depts.find(d => d.department_name === name);
    if (found) await deleteDepartmentViaApi(request, token, found.department_id);
  });

  test('budget with two decimal places is accepted', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    const modal = await openAddModal(page);
    const name = uniqueDeptName();
    await modal.locator('#department_name').fill(name);
    await modal.locator('#budget').fill('99999.99');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'created');

    const res = await request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    const found = depts.find(d => d.department_name === name);
    if (found) await deleteDepartmentViaApi(request, token, found.department_id);
  });

  test('budget input has min=0 and step=0.01 attributes', async ({ page }) => {
    const modal = await openAddModal(page);
    const budgetInput = modal.locator('#budget');
    expect(await budgetInput.getAttribute('min')).toBe('0');
    expect(await budgetInput.getAttribute('step')).toBe('0.01');
    await page.locator('.dept-btn-cancel').click();
  });

  test('description field is optional — form submits without it', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    const modal = await openAddModal(page);
    const name = uniqueDeptName();
    await modal.locator('#department_name').fill(name);
    await modal.locator('#budget').fill('10000');
    await page.locator('.dept-btn-submit').click();
    await waitForToast(page, 'created');

    const res = await request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    const found = depts.find(d => d.department_name === name);
    if (found) await deleteDepartmentViaApi(request, token, found.department_id);
  });

});

// ─── Inactive Status Rules ────────────────────────────────────────────────────

test.describe('Department Validation — Inactive Status Rules', () => {

  test('setting department Inactive with active employees is blocked', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId, { status: 'Active' });

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const ra = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const da = await ra.json();
      const deptName = da.department_name;
      expect(ra.ok(), JSON.stringify(da)).toBe(true);
      await page.locator('#search').fill(deptName);
      await page.locator('.dept-card').filter({ hasText: deptName }).locator('.btn-edit').click();
      await page.locator('.dept-modal #status').selectOption('Inactive');
      await page.locator('.dept-btn-submit').click();
      await waitForToast(page, 'Cannot make department inactive while it has active employees.');
      await expect(page.locator('.dept-modal')).toBeVisible();
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('setting department Inactive succeeds when no active employees', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);

    try {
      const rb = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const db2 = await rb.json();
      const deptName = db2.department_name || db2.data?.department_name;
      expect(deptName, 'Department detail API must return its name').toBeTruthy();

      // Set to Inactive via API
      await request.put(`/api/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { status: 'Inactive' },
      });

      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      await page.locator('#search').fill(deptName);
      const updatedCard = page.locator('.dept-card').filter({ hasText: deptName });
      await expect(updatedCard.locator('.dept-status-badge.badge-inactive')).toBeVisible();
    } finally {
      await request.put(`/api/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { status: 'Active' },
      }).catch(() => {});
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('backend blocks Inactive status with active employees via API', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/departments');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();

    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId, { status: 'Active' });

    try {
      const res = await request.put(`/api/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { status: 'Inactive' },
      });
      expect(res.status()).toBe(400);
      if (res.status() === 400) {
        const body = await res.json();
        expect(body.message).toMatch(/active employees/i);
      }
      const check = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const dept = await check.json();
      expect(dept.status).toBe('Active');
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});

// ─── Delete Constraints ───────────────────────────────────────────────────────

test.describe('Department Validation — Delete Constraints', () => {

  test('deleting department with assigned employees is blocked by backend', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/departments');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();

    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId);

    try {
      const res = await request.delete(`/api/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(400);
      if (res.status() === 400) {
        const body = await res.json();
        expect(body.message).toMatch(/employees/i);
      }
      const check = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      expect(check.status()).toBe(200);
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('UI blocks delete when department has assets (asset_count > 0)', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);

    const res = await request.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
    const depts = await res.json();
    if (depts.length === 0) { test.skip(); return; }

    await page.route('**/api/departments', async route => {
      const original = await route.fetch();
      const json = await original.json();
      if (Array.isArray(json) && json.length > 0) {
        json[0] = { ...json[0], asset_count: 1 };
      }
      await route.fulfill({ json });
    });

    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });

    let dialogShown = false;
    page.once('dialog', () => { dialogShown = true; });
    await page.locator('.dept-card').first().locator('.btn-delete').click();
    await waitForToast(page, 'assets');
    expect(dialogShown).toBe(false);
  });

});

// ─── Employee Count in Department ─────────────────────────────────────────────

test.describe('Department Validation — Employee Count', () => {

  test('employee count on card increments after assigning an employee', async ({ page, request }) => {
    let empId;
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);

    try {
      const rc = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const dc = await rc.json();
      const deptName = dc.department_name || dc.data?.department_name;
      expect(deptName, 'Department detail API must return its name').toBeTruthy();

      empId = await createEmployeeViaApi(request, token, deptId);

      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      await page.locator('#search').fill(deptName);
      const updatedCard = page.locator('.dept-card').filter({ hasText: deptName });
      await expect(updatedCard.locator('.dept-meta-item').filter({ hasText: '1 Employees' })).toBeVisible();

    } finally {
      if (empId) await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('employee details appear in department detail view after assignment', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    const empId = await createEmployeeViaApi(request, token, deptId);

    try {
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      const rd = await request.get(`/api/departments/${deptId}`, { headers: { Authorization: `Bearer ${token}` } });
      const dd = await rd.json();
      const deptName = dd.department_name || dd.data?.department_name;
      expect(deptName, 'Department detail API must return its name').toBeTruthy();

      await page.locator('#search').fill(deptName);
      await page.locator('.dept-card').filter({ hasText: deptName }).locator('.btn-view').click();

      const viewModal = page.locator('.dept-modal');
      await expect(viewModal.locator('.dept-inner-table tbody tr')).toHaveCount(1);
      await page.locator('.dept-modal-close').last().click();
    } finally {
      await deleteEmployeeViaApi(request, token, empId);
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});
