import { test, expect } from '@playwright/test';
import { preparePage, gotoFeature, json, defaultGetBody } from './test.helpers.js';

const logs = [
  { log_id: 101, time: '2026-10-03T08:30:00Z', user_id: 1, user: { user_name: 'admin' }, role: 'Admin', action: 'LOGIN', details: 'Successful login', ip_address: '127.0.0.1' },
  { log_id: 102, time: '2026-10-03T09:00:00Z', user_id: 2, user: { first_name: 'Mira', last_name: 'User' }, role: 'Manager', action: 'CREATE_PROJECT', details: 'Created City Hardware Renovation', ip_address: '10.0.0.5' },
];

async function setupAuditApi(page, { fail = false } = {}) {
  const queries = [];
  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/audit_log/actions') return json(route, ['LOGIN', 'CREATE_PROJECT', 'DELETE_PROJECT']);
    if (path === '/api/audit_log') {
      queries.push(Object.fromEntries(url.searchParams));
      if (fail) return json(route, { message: 'Forbidden' }, 403);
      const pageNumber = Number(url.searchParams.get('page') || 1);
      return json(route, { data: pageNumber === 1 ? logs : [logs[1]], total: 22, pages: 2 });
    }
    if (request.method() === 'GET') return json(route, defaultGetBody(path));
    throw new Error(`Unexpected request: ${request.method()} ${path}`);
  });
  return { queries };
}

test.beforeEach(async ({ page }) => preparePage(page));

test.describe('Audit Logs', () => {
  test('loads audit records, count, user, role, action, and IP address', async ({ page }) => {
    await setupAuditApi(page);
    await gotoFeature(page, '/audit-logs', 'Audit Logs');
    await expect(page.getByText('22 records')).toBeVisible();
    await expect(page.locator('.proc-table').getByText('admin', { exact: true })).toBeVisible();
    await expect(page.locator('.proc-table').getByText('LOGIN', { exact: true })).toBeVisible();
    await expect(page.getByText('127.0.0.1')).toBeVisible();
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(2);
  });

  test('sends username, action, and date filters and clears them', async ({ page }) => {
    const api = await setupAuditApi(page);
    await gotoFeature(page, '/audit-logs', 'Audit Logs');
    await page.locator('#search').fill('mira');
    await page.locator('#action').selectOption('CREATE_PROJECT');
    await page.locator('#from').fill('2026-10-01');
    await page.locator('#to').fill('2026-10-03');
    await expect.poll(() => api.queries.some(query => query.search === 'mira' && query.action === 'CREATE_PROJECT' && query.from === '2026-10-01' && query.to === '2026-10-03')).toBe(true);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('#search')).toHaveValue('');
    await expect(page.locator('#action')).toHaveValue('');
  });

  test('opens complete audit details and closes the modal', async ({ page }) => {
    await setupAuditApi(page);
    await gotoFeature(page, '/audit-logs', 'Audit Logs');
    await page.getByTitle('View details').first().click();
    await expect(page.getByRole('heading', { name: 'Audit Log Entry #101' })).toBeVisible();
    await expect(page.locator('.proc-modal').getByText('Successful login', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Audit Log Entry #101' })).toHaveCount(0);
  });

  test('requests the next page and updates the page indicator', async ({ page }) => {
    const api = await setupAuditApi(page);
    await gotoFeature(page, '/audit-logs', 'Audit Logs');
    await page.locator('.proc-pagination > button').last().click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect.poll(() => api.queries.some(query => query.page === '2')).toBe(true);
    await expect(page.locator('.proc-table tbody tr')).toHaveCount(1);
  });

  test('shows the admin-only error when the audit API returns 403', async ({ page }) => {
    await setupAuditApi(page, { fail: true });
    await gotoFeature(page, '/audit-logs', 'Audit Logs');
    await expect(page.getByText('Access denied: Admin only').first()).toBeVisible();
    await expect(page.getByText('No audit logs found')).toBeVisible();
  });
});
