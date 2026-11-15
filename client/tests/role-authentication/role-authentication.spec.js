import { test, expect } from '@playwright/test';

const roleUsers = {
  admin: { user_id: 1, user_name: 'admin-user', first_name: 'Admin', last_name: 'User', role: 'Admin' },
  manager: { user_id: 2, user_name: 'manager-user', first_name: 'Manager', last_name: 'User', role: 'Manager' },
  cashier: { user_id: 3, user_name: 'cashier-user', first_name: 'Cashier', last_name: 'User', role: 'Cashier' },
};

function analyticsEmpty() {
  const empty = { revenue: [], efficiency: [], categories: [] };
  return { kpis: {}, recentTransactions: [], timeSeries: { daily: empty, weekly: empty, monthly: empty } };
}

async function setupAuthApi(page, {
  loginStatus = 200,
  loginMessage = 'Invalid Username or Password',
  chequeAlerts = { summary: {}, alerts: [] },
  customerDueAlerts = { summary: {}, alerts: [] },
} = {}) {
  const calls = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (!path.startsWith('/api/')) return route.continue();

    if (path === '/api/auth/login' && method === 'POST') {
      const body = request.postDataJSON();
      calls.push({ method, path, body });
      if (loginStatus !== 200) return route.fulfill({ status: loginStatus, json: { message: loginMessage } });
      const role = String(body.role || 'admin').toLowerCase();
      const user = roleUsers[role] || roleUsers.admin;
      return route.fulfill({ json: { message: 'Login successful', token: `token-${role}`, user } });
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      calls.push({ method, path, body: request.postDataJSON() });
      return route.fulfill({ json: { message: 'Logout successful' } });
    }
    if (path === '/api/profile') return route.fulfill({ json: {} });
    if (path === '/api/dashboard/analytical') return route.fulfill({ json: analyticsEmpty() });
    if (path === '/api/dashboard/cashier') return route.fulfill({ json: { salesToday: 0, itemsSold: 0, returnsCount: 0, transactionsCount: 0, recentTransactions: [] } });
    if (path === '/api/alerts/summary') return route.fulfill({ json: {} });
    if (path === '/api/alerts/customer-due-alerts') return route.fulfill({ json: customerDueAlerts });
    if (path === '/api/alerts') return route.fulfill({ json: [] });
    if (path === '/api/procurement/payments/cheque-alerts') return route.fulfill({ json: chequeAlerts });
    if (path === '/api/audit_log/actions') return route.fulfill({ json: ['LOGIN', 'LOGOUT'] });
    if (path === '/api/audit_log') return route.fulfill({ json: { data: [], total: 0, pages: 1 } });
    if (path === '/api/products') return route.fulfill({ json: [] });
    if (method === 'GET') return route.fulfill({ json: {} });
    return route.fulfill({ json: { message: 'OK' } });
  });
  return { calls };
}

async function seedSession(page, role) {
  await page.addInitScript(({ selectedRole }) => {
    const roleName = selectedRole.toLowerCase();
    sessionStorage.setItem('token', `seeded-${roleName}-token`);
    sessionStorage.setItem('role', roleName);
    sessionStorage.setItem('userName', `${roleName}-user`);
    sessionStorage.setItem('userId', roleName === 'admin' ? '1' : roleName === 'manager' ? '2' : '3');
    localStorage.setItem('userId', sessionStorage.getItem('userId'));
    localStorage.setItem('userName', `${roleName}-user`);
    localStorage.setItem('role', roleName);
  }, { selectedRole: role });
}

async function login(page, role, username = `${role}-user`, password = 'Password1!') {
  await page.goto(`/login/${role}`);
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
}

test.describe('Role Selection and Login', () => {
  test('role selector opens the correct login page for every role', async ({ page }) => {
    await setupAuthApi(page);
    for (const role of ['Admin', 'Cashier', 'Manager']) {
      await page.goto('/');
      await page.getByRole('button', { name: role, exact: true }).click();
      await expect(page).toHaveURL(`/login/${role.toLowerCase()}`);
      await expect(page.getByRole('heading', { name: `${role.toLowerCase()} Login` })).toBeVisible();
    }
  });

  for (const role of ['admin', 'manager', 'cashier']) {
    test(`${role} login stores the authenticated identity and opens its own dashboard`, async ({ page }) => {
      const api = await setupAuthApi(page);
      await login(page, role);
      await expect(page).toHaveURL(`/dashboard/${role}`);
      await expect(page.getByText('Login successful!').first()).toBeVisible();
      const storage = await page.evaluate(() => ({
        token: sessionStorage.getItem('token'), role: sessionStorage.getItem('role'),
        userName: sessionStorage.getItem('userName'), userId: localStorage.getItem('userId'),
      }));
      expect(storage).toEqual({ token: `token-${role}`, role, userName: `${role}-user`, userId: String(roleUsers[role].user_id) });
      expect(api.calls[0]).toEqual({ method: 'POST', path: '/api/auth/login', body: { user_name: `${role}-user`, password: 'Password1!', role } });
    });
  }

  test('invalid credentials show the backend error and do not create a session', async ({ page }) => {
    const api = await setupAuthApi(page, { loginStatus: 401, loginMessage: 'Invalid Username or Password. You have only 4 attempts left' });
    await login(page, 'admin', 'admin-user', 'WrongPassword');
    await expect(page.getByText('Invalid Username or Password. You have only 4 attempts left').first()).toBeVisible();
    await expect(page).toHaveURL('/login/admin');
    expect(await page.evaluate(() => sessionStorage.getItem('token'))).toBeNull();
    expect(api.calls).toHaveLength(1);
  });

  test('role mismatch shows access denied and does not authenticate', async ({ page }) => {
    await setupAuthApi(page, { loginStatus: 403, loginMessage: 'Access denied' });
    await login(page, 'manager', 'admin-user', 'Password1!');
    await expect(page.getByText('Access denied', { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL('/login/manager');
    expect(await page.evaluate(() => sessionStorage.getItem('role'))).toBeNull();
  });

  test('required fields prevent an empty login request', async ({ page }) => {
    const api = await setupAuthApi(page);
    await page.goto('/login/admin');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    expect(api.calls).toEqual([]);
    expect(await page.getByPlaceholder('Username').evaluate(input => input.validity.valueMissing)).toBe(true);
  });

  test('password visibility control toggles the input type', async ({ page }) => {
    await setupAuthApi(page);
    await page.goto('/login/admin');
    const password = page.getByPlaceholder('Password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.locator('.input-box').filter({ has: password }).locator('span').click();
    await expect(password).toHaveAttribute('type', 'text');
  });
});

test.describe('Protected Routes and Role Authorization', () => {
  test('unauthenticated users are redirected to the required login page', async ({ page }) => {
    await setupAuthApi(page);
    await page.goto('/audit-logs');
    await expect(page).toHaveURL('/login/admin');
    await expect(page.getByRole('heading', { name: 'admin Login' })).toBeVisible();
  });

  test('admin can access the admin-only audit log route', async ({ page }) => {
    await seedSession(page, 'admin');
    await setupAuthApi(page);
    await page.goto('/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    await expect(page).toHaveURL('/audit-logs');
  });

  test('manager cannot enter the admin-only audit log route', async ({ page }) => {
    await seedSession(page, 'manager');
    await setupAuthApi(page);
    await page.goto('/audit-logs');
    await expect(page).toHaveURL('/dashboard/manager');
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toHaveCount(0);
  });

  test('manager is redirected away from the cashier workspace', async ({ page }) => {
    await seedSession(page, 'manager');
    await setupAuthApi(page);
    await page.goto('/cashier-panel/billing');
    await expect(page).toHaveURL('/dashboard/manager');
  });

  test('cashier is redirected away from procurement', async ({ page }) => {
    await seedSession(page, 'cashier');
    await setupAuthApi(page);
    await page.goto('/procurement');
    await expect(page).toHaveURL('/dashboard/cashier');
    await expect(page.getByRole('heading', { name: /Welcome, cashier-user!/ })).toBeVisible();
  });

  test('cashier can view all Out of Stock alerts even when their status is Purchase Ordered', async ({ page }) => {
    const outOfStockAlerts = [501, 502].map((alertId) => ({
      alert_id: alertId,
      alert_type: 'Out of Stock',
      status: 'Purchase Ordered',
      product_id: alertId,
      product: {
        product_id: alertId,
        product_name: `Zero Stock Product ${alertId}`,
        stock_quantity: 0,
        min_stock_quantity: 5,
        reorder_level: 3,
      },
    }));
    await setupAuthApi(page);
    await page.route('**/api/alerts/summary', route => route.fulfill({
      json: {
        'Out of Stock': 2,
        'Low Stock': 0,
        Reorder: 0,
        'Near Expiry': 0,
        Expired: 0,
        total: 2,
      },
    }));
    await page.route(/\/api\/alerts(?:\?.*)?$/, route => route.fulfill({
      json: outOfStockAlerts,
    }));
    await seedSession(page, 'cashier');
    await page.goto('/alerts');

    const outOfStockFilter = page.locator('.alert-chip').filter({ hasText: 'Out Of Stock' });
    await expect(outOfStockFilter).toContainText('2');
    await outOfStockFilter.click();
    await expect(page.getByRole('row').filter({ hasText: 'Zero Stock Product 501' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Zero Stock Product 502' })).toBeVisible();
    await expect(page.getByText('No alerts found.')).toHaveCount(0);
  });

  test('cashier can open payment alerts read-only without being redirected', async ({ page }) => {
    await setupAuthApi(page, {
      chequeAlerts: {
        summary: { total: 1, dueSoon: 1, dueToday: 0, overdue: 0, bounced: 0 },
        alerts: [{
          payment_id: 42,
          supplier_name: 'Read Only Supplier',
          cheque_number: 'CHQ-42',
          bank_name: 'Example Bank',
          clearing_date: '2026-11-16',
          amount: 1250,
          days_remaining: 2,
          alert_type: 'Due Soon',
        }],
      },
    });
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'token-cashier');
      sessionStorage.setItem('role', 'cashier');
      sessionStorage.setItem('userName', 'cashier-user');
      localStorage.setItem('role', 'cashier');
      localStorage.setItem('userName', 'cashier-user');
    });
    await page.reload();

    await page.goto('/alerts?tab=payment');

    await expect(page).toHaveURL('/alerts?tab=payment');
    await expect(page.locator('.alert-tab-btn').filter({ hasText: 'Payment Alerts' })).toBeVisible();
    for (const category of [
      'All Payment Alerts',
      'Cheques Due Soon',
      'Cheques Due Today',
      'Cheques Overdue',
      'Cheques Bounced',
    ]) {
      await expect(page.getByRole('button', { name: new RegExp(category) })).toBeVisible();
    }

    const table = page.locator('.proc-table');
    await expect(table.locator('thead th')).toHaveText([
      'ID', 'Supplier', 'Cheque No.', 'Bank', 'Clearing Date',
      'Amount', 'Days Remaining', 'Alert Status',
    ]);
    const alertRow = table.getByRole('row').filter({ hasText: 'CHQ-42' });
    await expect(alertRow).toContainText('Read Only Supplier');
    await expect(alertRow).toContainText('Example Bank');
    await expect(alertRow).toContainText('LKR 1,250.00');
    await expect(table.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Mark Cleared|Resolve Bounced|Confirm Payment/ })).toHaveCount(0);
  });

  test('cashier can collect partial and full dues from Customer Due Alerts', async ({ page }) => {
    await setupAuthApi(page);
    let remainingDue = 1500;
    let requestedCustomerId;
    let submittedPayment;
    const paymentHistory = [];
    await page.route('**/api/alerts/customer-due-alerts', async route => {
      return route.fulfill({
        json: remainingDue > 0 ? {
          summary: { total: 1, dueSoon: 0, dueToday: 0, overdue: 1 },
          alerts: [{
            bill_id: 7,
            customer_id: 42,
            invoice_number: 'INV-7',
            customer_name: 'Due Customer',
            phone_no: '0771234567',
            expected_payment_date: '2026-11-14',
            total_amount: 1500,
            due_amount: remainingDue,
            alert_type: 'Overdue',
            days_remaining: -1,
          }],
        } : {
          summary: { total: 0, dueSoon: 0, dueToday: 0, overdue: 0 },
          alerts: [],
        },
      });
    });
    await page.route('**/api/customers*', route => route.fulfill({
      json: { customer_id: 42, customer_name: 'Due Customer', phone_no: '0771234567' },
    }));
    await page.route('**/api/bills*', async route => {
      const url = new URL(route.request().url());
      requestedCustomerId = url.searchParams.get('customer_id');
      return route.fulfill({
        json: [
          { bill_id: 8, bill_no: 'INV-8', total_amount: '2000.00', balance_due: '1500.00', bill_date: '2026-11-10' },
          ...(remainingDue > 0 ? [{
            bill_id: 7,
            bill_no: 'INV-7',
            total_amount: '1500.00',
            balance_due: remainingDue.toFixed(2),
            bill_date: '2026-11-11',
          }] : []),
        ],
      });
    });
    await page.route('**/api/payments*', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        submittedPayment = request.postDataJSON();
        remainingDue = Math.max(0, remainingDue - Number(submittedPayment.amount_paid));
        paymentHistory.push({
          payment_id: paymentHistory.length + 1,
          bill_id: submittedPayment.bill_id,
          amount_paid: submittedPayment.amount_paid,
          payment_method: submittedPayment.payment_method,
          payment_date: '2026-11-15',
        });
        return route.fulfill({ status: 201, json: { message: 'Payment collected' } });
      }
      const billId = new URL(request.url()).searchParams.get('bill_id');
      return route.fulfill({
        json: paymentHistory.filter(payment => String(payment.bill_id) === billId),
      });
    });
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'token-cashier');
      sessionStorage.setItem('role', 'cashier');
      sessionStorage.setItem('userName', 'cashier-user');
      localStorage.setItem('role', 'cashier');
      localStorage.setItem('userName', 'cashier-user');
    });
    await page.reload();
    await page.goto('/alerts?tab=customer-due');

    await expect(page.getByRole('row').filter({ hasText: 'INV-7' })).toContainText('Due Customer');
    await page.getByRole('button', { name: 'Collect Due' }).click();
    await expect(page).toHaveURL('/cashier-panel/due-collection/collect');
    await expect(page.locator('#due-collection-search')).toHaveValue('0771234567');
    await expect(page.locator('.customer-summary')).toContainText('Due Customer');
    await expect(page.locator('.customer-summary')).toContainText('0771234567');
    await expect(page.getByRole('row').filter({ hasText: 'INV-7' }).locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.getByRole('row').filter({ hasText: 'INV-8' }).locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(page.locator('.due-right .collection-summary')).toContainText('INV-7');
    await expect(page.locator('.due-right .collection-summary')).toContainText('1500.00');
    await expect(page.locator('#due-amount')).toHaveValue('1500.00');
    expect(requestedCustomerId).toBe('42');

    await page.locator('#due-amount').fill('500');
    await page.locator('.collect-btn').click();
    await expect(page.locator('#due-amount')).toHaveValue('1000.00');
    await expect(page.getByRole('row').filter({ hasText: 'INV-7' })).toContainText('1000.00');
    await expect(page.locator('.due-right .collection-summary')).toContainText('Paid so far');
    await expect(page.locator('.due-right .collection-summary')).toContainText('500.00');
    await expect(page.locator('.due-right .collection-summary')).toContainText('Balance due');
    expect(submittedPayment.amount_paid).toBe(500);

    await page.goto('/alerts?tab=customer-due');
    await page.reload();
    const updatedDueAlert = page.getByRole('row').filter({ hasText: 'INV-7' });
    await expect(updatedDueAlert).toContainText('LKR 1,000.00');
    await updatedDueAlert.getByRole('button', { name: 'Collect Due' }).click();
    await expect(page.locator('#due-amount')).toHaveValue('1000.00');
    await page.locator('.collect-btn').click();
    await expect(page.getByRole('row').filter({ hasText: 'INV-7' })).toHaveCount(0);
    expect(submittedPayment.amount_paid).toBe(1000);

    await page.goto('/alerts?tab=customer-due');
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: 'INV-7' })).toHaveCount(0);
  });

  test('manager can view customer due details without collection controls', async ({ page }) => {
    await setupAuthApi(page, {
      customerDueAlerts: {
        summary: { total: 1, dueSoon: 0, dueToday: 0, overdue: 1 },
        alerts: [{
          bill_id: 7,
          customer_id: 42,
          invoice_number: 'INV-7',
          customer_name: 'Due Customer',
          phone_no: '0771234567',
          address: '12 Main Street',
          expected_payment_date: '2026-11-14',
          total_amount: 1500,
          due_amount: 750,
          bill_status: 'PARTIAL',
          alert_type: 'Overdue',
          days_remaining: -1,
        }],
      },
    });
    await seedSession(page, 'manager');
    await page.goto('/manager/alerts?tab=customer-due');

    await expect(page.getByRole('button', { name: 'View', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collect Due' })).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();

    const details = page.locator('.dm-box');
    await expect(details.getByRole('heading', { name: 'Customer Due Details' })).toBeVisible();
    for (const value of [
      'INV-7', '7', '42', 'Due Customer', '0771234567', '12 Main Street',
      '14/11/2026', 'LKR 1,500.00', 'LKR 750.00', 'PARTIAL', 'Overdue', '1 day overdue',
    ]) {
      await expect(details).toContainText(value);
    }
    await expect(details.getByRole('button', { name: /collect|confirm|edit|save/i })).toHaveCount(0);
    await expect(details.locator('input, select, textarea')).toHaveCount(0);
  });

  test('admin retains the existing Customer Due collection action', async ({ page }) => {
    await setupAuthApi(page, {
      customerDueAlerts: {
        summary: { total: 1, dueSoon: 0, dueToday: 0, overdue: 1 },
        alerts: [{
          bill_id: 7,
          customer_id: 42,
          invoice_number: 'INV-7',
          customer_name: 'Due Customer',
          phone_no: '0771234567',
          expected_payment_date: '2026-11-14',
          total_amount: 1500,
          due_amount: 750,
          bill_status: 'PARTIAL',
          alert_type: 'Overdue',
          days_remaining: -1,
        }],
      },
    });
    await page.route('**/api/bills*', route => route.fulfill({
      json: [{
        bill_id: 7,
        bill_no: 'INV-7',
        total_amount: '1500.00',
        balance_due: '750.00',
        bill_date: '2026-11-11',
      }],
    }));
    await page.route('**/api/payments*', route => route.fulfill({ json: [] }));
    await seedSession(page, 'admin');
    await page.goto('/alerts?tab=customer-due');

    await page.getByRole('button', { name: 'Collect Due' }).click();
    await expect(page).toHaveURL('/cashier-panel/due-collection/collect');
    await expect(page.locator('#due-amount')).toHaveValue('750.00');
  });

  test('an authenticated session is restored after a page reload', async ({ page }) => {
    await seedSession(page, 'cashier');
    await setupAuthApi(page);
    await page.goto('/dashboard/cashier');
    await page.reload();
    await expect(page).toHaveURL('/dashboard/cashier');
    await expect(page.getByRole('heading', { name: /Welcome, cashier-user!/ })).toBeVisible();
  });
});

test.describe('Logout and Unauthorized Sessions', () => {
  test('logout can be cancelled, then confirmed to clear identity and notify the API', async ({ page }) => {
    await seedSession(page, 'admin');
    const api = await setupAuthApi(page);
    await page.goto('/dashboard/admin');
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm Logout' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/dashboard/admin');
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.locator('.lcm-card').getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login/admin');
    const storage = await page.evaluate(() => ({ token: sessionStorage.getItem('token'), role: sessionStorage.getItem('role'), localRole: localStorage.getItem('role') }));
    expect(storage).toEqual({ token: null, role: null, localRole: null });
    await expect.poll(() => api.calls.some(call => call.path === '/api/auth/logout' && call.body.user_id === '1')).toBe(true);
  });

  test('a 401 API response clears the session and returns the user to login', async ({ page }) => {
    await seedSession(page, 'admin');
    await page.route('http://localhost:5000/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/profile') return route.fulfill({ status: 401, json: { message: 'Invalid token' } });
      return route.fulfill({ json: {} });
    });
    await page.goto('/profile');
    await expect(page).toHaveURL('/login/admin');
    expect(await page.evaluate(() => sessionStorage.getItem('token'))).toBeNull();
  });
});
