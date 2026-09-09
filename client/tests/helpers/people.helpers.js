// tests/helpers/people.helpers.js
// Shared helpers for People module (Employees + Departments) E2E tests.

/**
 * Restore sessionStorage from localStorage entries injected by auth setup.
 * Identical mechanism to procurement.helpers.js — AuthContext reads sessionStorage.
 * @param {import('@playwright/test').Page} page
 */
export async function restoreSession(page) {
  await page.addInitScript(() => {
    const keys = ['token', 'role', 'userName', 'userId', 'userFirstName',
                  'userLastName', 'userFullName', 'loginTime'];
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, val);
      }
    }
  });
}

/**
 * Navigate to the Employees page (admin or manager prefix).
 * Waits for the People top-nav to confirm the workspace loaded.
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'} role
 */
export async function gotoEmployees(page, role = 'admin') {
  const path = role === 'manager' ? '/manager/employees' : '/employees';
  // Confirm app readiness without waiting for every image and subresource to load.
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.locator('.procurement-top-nav').waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * Navigate to the Departments page (admin or manager prefix).
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'} role
 */
export async function gotoDepartments(page, role = 'admin') {
  const path = role === 'manager' ? '/manager/departments' : '/departments';
  // Confirm app readiness without waiting for every image and subresource to load.
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.locator('.procurement-top-nav').waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * Wait for a react-hot-toast notification and optionally assert its text.
 * react-hot-toast renders inside a <div> with role="status" or uses data attributes.
 * We match any visible element that contains the toast text.
 * @param {import('@playwright/test').Page} page
 * @param {string} [textContains]
 */
export async function waitForToast(page, textContains) {
  if (textContains) {
    // Wait for any element containing the text to appear (toast or inline error)
    const locator = page.locator(`text=${textContains}`).first();
    await locator.waitFor({ state: 'visible', timeout: 10_000 });
  } else {
    // Just wait for any toast container
    const toast = page.locator('[data-hot-toast], [class*="toast"], [class*="Toaster"]').first();
    await toast.waitFor({ state: 'visible', timeout: 8_000 });
  }
}

/**
 * Generate a unique department name using a word-based suffix to avoid
 * numeric timestamps in names (department names allow letters/numbers/spaces).
 * @returns {string}
 */
export function uniqueDeptName() {
  const suffix = Date.now().toString(36).toUpperCase(); // e.g. "LX4K2"
  return `Test Dept ${suffix}`;
}

/**
 * Generate a unique employee first/last name pair.
 * Uses only letters and spaces — no numeric timestamps in names.
 * The suffix is derived from a base-26 encoding of the timestamp.
 * @returns {{ first_name: string, last_name: string }}
 */
export function uniqueEmployeeName() {
  // Convert timestamp to a short alphabetic string, e.g. "BCDE"
  const alpha = (n) => {
    let s = '';
    while (n > 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s || 'A';
  };
  const suffix = alpha(Date.now() % (26 ** 4)); // 4-letter suffix
  return { first_name: `Test${suffix}`, last_name: 'Employee' };
}

/**
 * Build a valid employee form payload for API-level creation.
 * Generates unique NIC, phone, and email to avoid collisions.
 * @param {object} overrides
 * @returns {object}
 */
export function validEmployeePayload(overrides = {}) {
  const { first_name, last_name } = uniqueEmployeeName();
  // Generate a unique 9-digit NIC suffix from timestamp
  const ts = Date.now();
  const nicDigits = String(ts % 1000000000).padStart(9, '1');
  const nic = `${nicDigits}V`;
  // Phone: rotate through 070-078 range using timestamp
  const prefix = 70 + (ts % 9);
  const phoneRest = String(ts % 10000000).padStart(7, '0');
  const phone_no = `0${prefix}${phoneRest}`;
  const email = `test${ts}@test.example`;
  return {
    first_name,
    last_name,
    nic,
    phone_no,
    email,
    address: 'Test Address, Colombo',
    position: 'Manager',
    salary: '50000',
    salary_category: 'monthly',
    join_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    ...overrides,
  };
}

/**
 * Create an employee via the API and return its ID.
 * Requires a valid auth token in the request context.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {number} departmentId
 * @param {object} [overrides]
 * @returns {Promise<number>} employee_id
 */
export async function createEmployeeViaApi(request, token, departmentId, overrides = {}) {
  const payload = validEmployeePayload({ department_id: String(departmentId), ...overrides });
  const res = await request.post('/api/employees', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: payload,
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`createEmployeeViaApi failed ${res.status()}: ${body}`);
  }
  const body = await res.json();
  return body.data.employee_id;
}

/**
 * Delete an employee via the API (cleanup).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {number} id
 */
export async function deleteEmployeeViaApi(request, token, id) {
  const response = await request.delete(`/api/employees/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Employee cleanup failed: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Create a department via the API and return its ID.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {object} [overrides]
 * @returns {Promise<number>} department_id
 */
export async function createDepartmentViaApi(request, token, overrides = {}) {
  const res = await request.post('/api/departments', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { department_name: uniqueDeptName(), budget: 100000, status: 'Active', ...overrides },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`createDepartmentViaApi failed ${res.status()}: ${body}`);
  }
  const body = await res.json();
  return body.data.department_id;
}

/**
 * Delete a department via the API (cleanup).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {number} id
 */
export async function deleteDepartmentViaApi(request, token, id) {
  const response = await request.delete(`/api/departments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Department cleanup failed: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Extract the auth token from the page's localStorage (injected by auth setup).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getToken(page) {
  return page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
}

/**
 * Open the Add Employee modal and fill the form with the given values.
 * Assumes the Employees page is already loaded.
 * @param {import('@playwright/test').Page} page
 * @param {object} fields
 */
export async function fillEmployeeForm(page, fields) {
  const modal = page.locator('.emp-modal');

  // Use label-adjacent inputs since labels are not linked via htmlFor
  if (fields.first_name !== undefined)
    await fillByAdjacentLabel(modal, 'First Name', fields.first_name);
  if (fields.last_name !== undefined)
    await fillByAdjacentLabel(modal, 'Last Name', fields.last_name);
  if (fields.nic !== undefined)
    await fillByAdjacentLabel(modal, 'NIC', fields.nic);
  if (fields.email !== undefined)
    await fillByAdjacentLabel(modal, 'Email', fields.email);
  if (fields.phone_no !== undefined)
    await modal.locator('#phone_no').fill(fields.phone_no);
  if (fields.position !== undefined)
    await fillByAdjacentLabel(modal, 'Position', fields.position);
  if (fields.salary !== undefined)
    await fillByAdjacentLabel(modal, 'Salary', fields.salary);
  if (fields.salary_category !== undefined)
    await modal.locator('#salary_category').selectOption(fields.salary_category);
  if (fields.join_date !== undefined)
    await modal.locator('#join_date').fill(fields.join_date);
  if (fields.department_id !== undefined)
    await modal.locator('.emp-field').filter({ hasText: 'Department' }).locator('select')
      .selectOption(String(fields.department_id));
  if (fields.status !== undefined)
    await modal.locator('#status').selectOption(fields.status);
}

/**
 * Fill an input that immediately follows a label containing labelText.
 * Handles the case where labels are NOT linked via htmlFor.
 * @param {import('@playwright/test').Locator} container
 * @param {string} labelText
 * @param {string} value
 */
export async function fillByAdjacentLabel(container, labelText, value) {
  // Find the .emp-field div whose label contains the text, then fill its input
  const field = container.locator('.emp-field').filter({ hasText: labelText }).first();
  const input = field.locator('input, textarea, select').first();
  const tag = await input.evaluate(el => el.tagName.toLowerCase()).catch(() => 'input');
  if (tag === 'select') {
    await input.selectOption(value);
  } else {
    await input.fill(value);
  }
}
