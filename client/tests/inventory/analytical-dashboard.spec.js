import { test, expect } from '@playwright/test';
import { restoreSession } from '../helpers/inventory.helpers.js';

const analyticsPayload = {
  kpis: {
    totalRevenue: 'LKR 125,000.00',
    salesVolume: '24 orders',
    aov: 'LKR 5,208.33',
    conversionRate: '18.75%',
  },
  recentTransactions: [
    { id: 'TXN-1001', customer: 'Nimal Perera', rawTime: '2026-09-21T08:30:00.000Z', amount: 12500, status: 'completed' },
    { id: 'TXN-1002', customer: 'Kamal Silva', rawTime: '2026-09-21T09:45:00.000Z', amount: 7800, status: 'pending' },
  ],
  timeSeries: {
    daily: {
      revenue: [{ name: 'Daily Marker', revenue: 12500 }],
      efficiency: [{ name: 'Daily Marker', conversion: 18.75, aov: 5208.33 }],
      categories: [{ name: 'Tools', sales: 12 }],
    },
    weekly: {
      revenue: [{ name: 'Weekly Marker', revenue: 52000 }],
      efficiency: [{ name: 'Weekly Marker', conversion: 20, aov: 6100 }],
      categories: [{ name: 'Paint', sales: 18 }],
    },
    monthly: {
      revenue: [{ name: 'Monthly Marker', revenue: 125000 }],
      efficiency: [{ name: 'Monthly Marker', conversion: 22, aov: 7200 }],
      categories: [{ name: 'Electrical', sales: 25 }],
    },
  },
};

async function setupDashboardApi(page, { analytics = analyticsPayload, status = 200 } = {}) {
  const analyticsRequests = [];
  const unexpectedWrites = [];

  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method !== 'GET') {
      unexpectedWrites.push(`${method} ${url.pathname}`);
      return route.abort();
    }

    if (url.pathname === '/api/dashboard/analytical') {
      analyticsRequests.push(url.pathname);
      return route.fulfill({ status, json: status >= 400 ? { message: 'Dashboard unavailable' } : analytics });
    }
    if (url.pathname === '/api/alerts/summary') return route.fulfill({ json: {} });
    if (url.pathname === '/api/alerts') return route.fulfill({ json: [] });
    if (url.pathname === '/api/procurement/payments/cheque-alerts') {
      return route.fulfill({ json: { summary: {}, alerts: [] } });
    }
    if (url.pathname === '/api/profile') return route.fulfill({ json: {} });

    return route.fulfill({ json: {} });
  });

  return { analyticsRequests, unexpectedWrites };
}

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Analytical Dashboard - Metrics and Charts', () => {
  test('loads real-time KPIs, charts, and recent transactions from the analytical API', async ({ page }) => {
    const api = await setupDashboardApi(page);
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Analytical Dashboard' })).toBeVisible();
    await expect(page.locator('.kpi-card')).toHaveCount(4);
    await expect(page.locator('.kpi-card').filter({ hasText: 'Total Revenue' })).toContainText('125,000.00');
    await expect(page.locator('.kpi-card').filter({ hasText: 'Sales Volume' })).toContainText('24 orders');
    await expect(page.locator('.kpi-card').filter({ hasText: 'Average Order Value' })).toContainText('5,208.33');
    await expect(page.locator('.kpi-card').filter({ hasText: 'Conversion Rate' })).toContainText('18.75%');
    await expect(page.locator('.ledger-row')).toHaveCount(2);
    await expect(page.getByText('Nimal Perera', { exact: true })).toBeVisible();
    expect(api.analyticsRequests.length).toBeGreaterThan(0);
    expect([...new Set(api.analyticsRequests)]).toEqual(['/api/dashboard/analytical']);
    expect(api.unexpectedWrites).toEqual([]);
  });

  test('daily, weekly, and monthly controls change the active analytical scope', async ({ page }) => {
    await setupDashboardApi(page);
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Active Scope: DAILY')).toBeVisible();
    await expect(page.getByText('Daily Marker').first()).toBeVisible();

    await page.getByRole('button', { name: 'Weekly', exact: true }).click();
    await expect(page.getByText('Active Scope: WEEKLY')).toBeVisible();
    await expect(page.getByText('Weekly Marker').first()).toBeVisible();

    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    await expect(page.getByText('Active Scope: MONTHLY')).toBeVisible();
    await expect(page.getByText('Monthly Marker').first()).toBeVisible();
  });
});

test.describe('Analytical Dashboard - Ledger Controls', () => {
  test('search filters transactions by customer, transaction ID, and amount', async ({ page }) => {
    await setupDashboardApi(page);
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
    const search = page.locator('#searchQuery');

    await search.fill('nimal');
    await expect(page.locator('.ledger-row')).toHaveCount(1);
    await expect(page.getByText('Nimal Perera', { exact: true })).toBeVisible();

    await search.fill('TXN-1002');
    await expect(page.locator('.ledger-row')).toHaveCount(1);
    await expect(page.getByText('Kamal Silva', { exact: true })).toBeVisible();

    await search.fill('12500');
    await expect(page.locator('.ledger-row')).toHaveCount(1);
    await expect(page.getByText('Nimal Perera', { exact: true })).toBeVisible();

    await search.fill('missing');
    await expect(page.getByText('No matching transactions found.')).toBeVisible();
  });

  test('PDF export opens a printable report containing the currently filtered ledger', async ({ page, context }) => {
    await setupDashboardApi(page);
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
    await page.locator('#searchQuery').fill('Nimal');

    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Export Report as PDF' }).click();
    const reportPage = await popupPromise;
    await reportPage.waitForLoadState('domcontentloaded');

    await expect(reportPage.getByRole('heading', { name: 'Recent Sales Ledger' })).toBeVisible();
    await expect(reportPage.getByText('Nimal Perera', { exact: true })).toBeVisible();
    await expect(reportPage.getByText('Kamal Silva', { exact: true })).toHaveCount(0);
    await expect(reportPage.getByText('Total: 1 transaction', { exact: true })).toBeVisible();
  });

  test('API failure displays an error and safe empty dashboard values', async ({ page }) => {
    const api = await setupDashboardApi(page, { status: 500 });
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Failed to load real database metrics from API').first()).toBeVisible();
    await expect(page.locator('.kpi-card').filter({ hasText: 'Total Revenue' })).toContainText('0.00');
    await expect(page.getByText('No matching transactions found.')).toBeVisible();
    expect(api.analyticsRequests.length).toBeGreaterThan(0);
    expect([...new Set(api.analyticsRequests)]).toEqual(['/api/dashboard/analytical']);
    expect(api.unexpectedWrites).toEqual([]);
  });
});
