// tests/people/employee-validation.spec.js
import { test, expect } from '@playwright/test';
import {
  restoreSession, gotoEmployees, waitForToast,
  createDepartmentViaApi, deleteDepartmentViaApi, getToken,
} from '../helpers/people.helpers.js';

const formMutations = new WeakMap();

test.beforeEach(async ({ page }, testInfo) => {
  await restoreSession(page);
  // Form validation uses controlled responses; CRUD and uniqueness tests use the real API.
  if (!/Duplicate Name|Backend Uniqueness/.test(testInfo.titlePath.join(' '))) {
    formMutations.set(page, []);
    await page.route('**/api/departments', route => route.fulfill({ json: [
      { department_id: 999999, department_name: 'Validation Department', status: 'Active' },
    ] }));
    await page.route('**/api/employees', route => {
      if (route.request().method() === 'POST') {
        formMutations.get(page).push(route.request().postData());
        return route.fulfill({ status: 201, json: { message: 'Employee created' } });
      }
      return route.fulfill({ json: [] });
    });
  }
});

test.afterEach(async ({ page }, testInfo) => {
  if (formMutations.has(page) && /rejected|blocked|shows error toast/.test(testInfo.title)) {
    expect(formMutations.get(page), 'Invalid forms must not submit employee mutations').toEqual([]);
  }
});


async function openAddModal(page) {
  await gotoEmployees(page);
  await page.getByRole('button', { name: /Add Employee/i }).click();
  return page.locator('.emp-modal');
}

async function fillValidForm(modal, overrides = {}) {
  const vals = {
    first_name: 'Valid', last_name: 'Employee',
    nic: '123456789V', email: 'valid.employee@test.example',
    phone_no: '0771234567', position: 'Manager', salary: '50000',
    ...overrides,
  };
  if (vals.first_name !== null)
    await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill(vals.first_name);
  if (vals.last_name !== null)
    await modal.locator('.emp-field').filter({ hasText: 'Last Name' }).locator('input').fill(vals.last_name);
  if (vals.nic !== null)
    await modal.locator('.emp-field').filter({ hasText: /^NIC/ }).locator('input').fill(vals.nic);
  if (vals.email !== null)
    await modal.locator('.emp-field').filter({ hasText: 'Email' }).locator('input').fill(vals.email);
  if (vals.phone_no !== null)
    await modal.locator('#phone_no').fill(vals.phone_no);
  if (vals.position !== null)
    await modal.locator('.emp-field').filter({ hasText: 'Position' }).locator('input').fill(vals.position);
  if (vals.salary !== null)
    await modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]').fill(vals.salary);
  await modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select').selectOption('999999');
}

// ─── Required Fields ──────────────────────────────────────────────────────────

test.describe('Employee Validation — Required Fields', () => {

  test('empty first name shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { first_name: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'First and last name required');
  });

  test('empty last name shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { last_name: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'First and last name required');
  });

  test('empty NIC shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'NIC is required');
  });

  test('empty email shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { email: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Email is required');
  });

  test('empty phone shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { phone_no: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Phone is required');
  });

  test('empty position shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { position: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Position is required');
  });

  test('empty salary shows error toast', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { salary: '' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Salary must be greater than zero');
  });

});

// ─── Name Rules ───────────────────────────────────────────────────────────────

test.describe('Employee Validation — Name Rules', () => {

  test('first name with only letters and spaces passes name check', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { first_name: 'Mary Jane' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('first name with digits is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { first_name: 'John123' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'only contain letters');
  });

  test('first name with symbols is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { first_name: 'John@Doe' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'only contain letters');
  });

  test('whitespace-only first name is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill('   ');
    await fillValidForm(modal, { first_name: null });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Names may only contain letters and spaces');
  });

  test('last name with digits is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { last_name: 'Smith99' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'only contain letters');
  });

  test('last name with symbols is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { last_name: 'O\'Brien' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'only contain letters');
  });

});

// ─── NIC Rules ────────────────────────────────────────────────────────────────

test.describe('Employee Validation — NIC Rules', () => {

  test('9 digits + V is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '987654321V' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('9 digits + v (lowercase) is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '987654321v' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('9 digits + X is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '987654321X' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('12 digits is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '200012345678' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('8 digits + V is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '12345678V' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid NIC');
  });

  test('10 digits + V is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '1234567890V' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid NIC');
  });

  test('11 digits only is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: '12345678901' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid NIC');
  });

  test('letter in wrong position is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { nic: 'V123456789' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid NIC');
  });

});

// ─── Email Rules ──────────────────────────────────────────────────────────────

test.describe('Employee Validation — Email Rules', () => {

  test('valid email is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { email: 'user@domain.com' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('email without @ is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { email: 'notanemail' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid email');
  });

  test('email without domain is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { email: 'user@' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid email');
  });

  test('email without TLD is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { email: 'user@domain' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'valid email');
  });

});

// ─── Position Rules ───────────────────────────────────────────────────────────

test.describe('Employee Validation — Position Rules', () => {

  test('position with letters and spaces is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { position: 'Senior Manager' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('position with digits is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { position: 'Manager2' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Position may only contain letters');
  });

  test('position with symbols is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { position: 'Manager@HQ' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Position may only contain letters');
  });

});

// ─── Salary Rules ─────────────────────────────────────────────────────────────

test.describe('Employee Validation — Salary Rules', () => {

  test('salary of zero is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { salary: '0' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Salary must be greater than zero');
  });

  test('negative salary is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { salary: '-100' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Salary must be greater than zero');
  });

  test('empty department is rejected without sending a mutation', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal);
    await modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select').selectOption('');
    const mutations = [];
    page.on('request', request => { if (request.method() === 'POST') mutations.push(request.url()); });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Department is required');
    expect(mutations).toEqual([]);
  });

  test('positive salary passes salary check', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { salary: '1' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

});

// ─── Join Date Rules ──────────────────────────────────────────────────────────

test.describe('Employee Validation — Join Date Rules', () => {

  test('empty join date is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal);
    await modal.locator('#join_date').fill('');
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Join date is required');
  });

  test('future join date is blocked without sending a mutation', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await modal.locator('#join_date').fill(tomorrow.toISOString().split('T')[0]);
    const mutations = [];
    page.on('request', request => { if (request.method() === 'POST') mutations.push(request.url()); });
    await page.locator('.emp-btn-submit').click();
    expect(await modal.locator('#join_date').evaluate(el => el.validity.rangeOverflow)).toBe(true);
    await expect(modal).toBeVisible();
    expect(mutations).toEqual([]);
  });

  test('join date has max set to today', async ({ page }) => {
    const modal = await openAddModal(page);
    const today = new Date().toISOString().split('T')[0];
    const maxAttr = await modal.locator('#join_date').getAttribute('max');
    expect(maxAttr).toBe(today);
  });

  test('past join date is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal);
    await modal.locator('#join_date').fill('2020-01-15');
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('today as join date is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    const today = new Date().toISOString().split('T')[0];
    await fillValidForm(modal);
    await modal.locator('#join_date').fill(today);
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

});

// ─── Phone Rules ──────────────────────────────────────────────────────────────

test.describe('Employee Validation — Phone Rules', () => {

  test('valid 10-digit 071 prefix is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { phone_no: '0712345678' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('valid 078 prefix is accepted', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { phone_no: '0781234567' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, 'Employee created');
    await expect(page.locator('.emp-modal')).toHaveCount(0);
  });

  test('9-digit number is rejected', async ({ page }) => {
    const modal = await openAddModal(page);
    await fillValidForm(modal, { phone_no: '071234567' });
    await page.locator('.emp-btn-submit').click();
    await waitForToast(page, '10 digits');
  });

  test('wrong prefix 079 is blocked by input filter', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#phone_no').fill('0791234567');
    const val = await modal.locator('#phone_no').inputValue();
    expect(val.length).toBeLessThan(10);
    await page.locator('.emp-btn-cancel').click();
  });

  test('non-digit input is stripped by filterSriLankanPhoneInput', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#phone_no').fill('abc');
    const val = await modal.locator('#phone_no').inputValue();
    expect(val).toBe('');
    await page.locator('.emp-btn-cancel').click();
  });

  test('phone input maxlength is 10', async ({ page }) => {
    const modal = await openAddModal(page);
    const maxLen = await modal.locator('#phone_no').getAttribute('maxlength');
    expect(maxLen).toBe('10');
    await page.locator('.emp-btn-cancel').click();
  });

  test('digit counter shows 10/10 when full number entered', async ({ page }) => {
    const modal = await openAddModal(page);
    await modal.locator('#phone_no').fill('0771234567');
    await expect(modal.locator('text=10/10 digits')).toBeVisible();
    await page.locator('.emp-btn-cancel').click();
  });

});

// ─── Duplicate Name ───────────────────────────────────────────────────────────

test.describe('Employee Validation — Duplicate Name', () => {

  test('duplicate full name (case-insensitive) is rejected', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    let empId;
    const ts = Date.now();
    try {
      const r1 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: {
          first_name: 'Duptest', last_name: 'Namecheck',
          nic: String(ts % 1000000000).padStart(9,'1') + 'V',
          phone_no: '071' + String(ts % 10000000).padStart(7,'0'),
          email: 'duptest' + ts + '@test.example',
          position: 'Manager', salary: '30000', salary_category: 'monthly',
          join_date: new Date().toISOString().split('T')[0],
          status: 'Active', department_id: String(deptId),
        },
      });
      empId = (await r1.json()).data?.employee_id;
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      await page.getByRole('button', { name: /Add Employee/i }).click();
      const modal = page.locator('.emp-modal');
      const ts2 = ts + 1;
      await modal.locator('.emp-field').filter({ hasText: 'First Name' }).locator('input').fill('DUPTEST');
      await modal.locator('.emp-field').filter({ hasText: 'Last Name' }).locator('input').fill('NAMECHECK');
      await modal.locator('.emp-field').filter({ hasText: /^NIC/ }).locator('input').fill(String(ts2 % 1000000000).padStart(9,'2') + 'V');
      await modal.locator('.emp-field').filter({ hasText: 'Email' }).locator('input').fill('other' + ts2 + '@test.example');
      await modal.locator('#phone_no').fill('0761234567');
      await modal.locator('.emp-field').filter({ hasText: 'Position' }).locator('input').fill('Manager');
      await modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]').fill('30000');
      await modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select').selectOption(String(deptId));
        await page.locator('.emp-btn-submit').click();
      await waitForToast(page, 'same name');
    } finally {
      if (empId) await request.delete('/api/employees/' + empId, { headers: { Authorization: 'Bearer ' + token } });
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('editing without changing name does not trigger self-duplicate error', async ({ page, request }) => {
    await restoreSession(page);
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(page);
    const deptId = await createDepartmentViaApi(request, token);
    let empId;
    const ts = Date.now();
    try {
      const r1 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: {
          first_name: 'Selfedit', last_name: 'Nodup',
          nic: String(ts % 1000000000).padStart(9,'4') + 'V',
          phone_no: '074' + String(ts % 10000000).padStart(7,'0'),
          email: 'selfedit' + ts + '@test.example',
          position: 'Manager', salary: '40000', salary_category: 'monthly',
          join_date: new Date().toISOString().split('T')[0],
          status: 'Active', department_id: String(deptId),
        },
      });
      empId = (await r1.json()).data?.employee_id;
      await page.reload();
      await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
      await page.locator('#search').fill('Selfedit');
      const row = page.locator('.emp-table tbody tr').filter({ hasText: 'Selfedit' });
      await row.locator('.btn-edit').click();
      const modal = page.locator('.emp-modal');
      await modal.locator('.emp-field').filter({ hasText: 'Salary' }).locator('input[type="number"]').fill('45000');
        await page.locator('.emp-btn-submit').click();
      await waitForToast(page, 'updated');
    } finally {
      if (empId) await request.delete('/api/employees/' + empId, { headers: { Authorization: 'Bearer ' + token } });
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});

// ─── Photo Size ───────────────────────────────────────────────────────────────

test.describe('Employee Validation — Photo Size', () => {

  test('photo exactly 1 MiB is accepted', async ({ page }) => {
    await openAddModal(page);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');
    const buffer = Buffer.alloc(1024 * 1024);
    png.copy(buffer);
    await page.locator('#file_field').setInputFiles({ name: 'boundary.png', mimeType: 'image/png', buffer });
    await expect(page.locator('.emp-photo-preview')).toBeVisible();
    expect(await page.locator('#file_field').evaluate(el => el.files[0].size)).toBe(1024 * 1024);
  });

  test('photo below 1 MiB is accepted (preview shown)', async ({ page }) => {
    await openAddModal(page);
    const smallPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    );
    await page.locator('#file_field').setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: smallPng });
    await expect(page.locator('.emp-photo-preview')).toBeVisible({ timeout: 5_000 });
    await page.locator('.emp-btn-cancel').click();
  });

  test('photo above 1 MiB is rejected with toast', async ({ page }) => {
    await openAddModal(page);
    const bigBuffer = Buffer.alloc(1 * 1024 * 1024 + 100, 0);
    await page.locator('#file_field').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: bigBuffer });
    await waitForToast(page, '1 MB');
    await page.locator('.emp-btn-cancel').click();
  });

});

// ─── Backend Uniqueness (API-level) ──────────────────────────────────────────

test.describe('Employee Validation — Backend Uniqueness (API)', () => {

  test('backend rejects duplicate NIC', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/employees');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();
    const deptId = await createDepartmentViaApi(request, token);
    const ts = Date.now();
    const sharedNic = String(ts % 1000000000).padStart(9,'3') + 'V';
    let id1;
    try {
      const base = {
        nic: sharedNic,
        phone_no: '073' + String(ts % 10000000).padStart(7,'0'),
        email: 'nictest1' + ts + '@test.example',
        position: 'Manager', salary: '30000', salary_category: 'monthly',
        join_date: new Date().toISOString().split('T')[0],
        status: 'Active', department_id: String(deptId),
      };
      const r1 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: { ...base, first_name: 'Nictest', last_name: 'One' },
      });
      id1 = (await r1.json()).data?.employee_id;
      const r2 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: { ...base, first_name: 'Nictest', last_name: 'Two',
          email: 'nictest2' + ts + '@test.example',
          phone_no: '072' + String((ts+1) % 10000000).padStart(7,'0') },
      });
      expect(r2.status()).toBe(400);
      const body = await r2.json();
      expect(body.message).toMatch(/NIC|already in use/i);
    } finally {
      if (id1) await request.delete('/api/employees/' + id1, { headers: { Authorization: 'Bearer ' + token } });
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

  test('backend rejects duplicate email', async ({ request, browser }) => {
    const ctx = await browser.newContext({ storageState: 'tests/auth/.auth-state.json' });
    const pg = await ctx.newPage();
    await restoreSession(pg);
    await pg.goto('/employees');
    await pg.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    const token = await getToken(pg);
    await ctx.close();
    const deptId = await createDepartmentViaApi(request, token);
    const ts = Date.now();
    const sharedEmail = 'emaildup' + ts + '@test.example';
    let id1;
    try {
      const base = {
        phone_no: '072' + String(ts % 10000000).padStart(7,'0'),
        email: sharedEmail,
        position: 'Manager', salary: '30000', salary_category: 'monthly',
        join_date: new Date().toISOString().split('T')[0],
        status: 'Active', department_id: String(deptId),
      };
      const r1 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: { ...base, first_name: 'Emaildup', last_name: 'One',
          nic: String(ts % 1000000000).padStart(9,'1') + 'V' },
      });
      id1 = (await r1.json()).data?.employee_id;
      const r2 = await request.post('/api/employees', {
        headers: { Authorization: 'Bearer ' + token },
        multipart: { ...base, first_name: 'Emaildup', last_name: 'Two',
          nic: String((ts+1) % 1000000000).padStart(9,'2') + 'V',
          phone_no: '075' + String((ts+1) % 10000000).padStart(7,'0') },
      });
      expect(r2.status()).toBe(400);
      const body = await r2.json();
      expect(body.message).toMatch(/[Ee]mail|already in use/i);
    } finally {
      if (id1) await request.delete('/api/employees/' + id1, { headers: { Authorization: 'Bearer ' + token } });
      await deleteDepartmentViaApi(request, token, deptId);
    }
  });

});
