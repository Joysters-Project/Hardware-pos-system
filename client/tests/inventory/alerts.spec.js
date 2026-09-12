// tests/inventory/alerts.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession } from '../helpers/inventory.helpers.js';

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  'Out of Stock': 2,
  'Low Stock': 3,
  'Reorder': 1,
  'Near Expiry': 2,
  'Expired': 1,
  total: 9,
  Active: 8,
  'Purchase Ordered': 1,
};

function makeAlerts() {
  return [
    {
      alert_id: 1, product_id: 10, alert_type: 'Out of Stock', status: 'Active',
      is_resolved: false, batch_number: null,
      product: { product_id: 10, product_name: 'Steel Hammer', stock_quantity: 0, min_stock_quantity: 5, reorder_level: 3, expiry_date: null, batch_no: null, status: 'active' },
    },
    {
      alert_id: 2, product_id: 11, alert_type: 'Low Stock', status: 'Active',
      is_resolved: false, batch_number: null,
      product: { product_id: 11, product_name: 'Iron Wrench', stock_quantity: 2, min_stock_quantity: 5, reorder_level: 3, expiry_date: null, batch_no: null, status: 'active' },
    },
    {
      alert_id: 3, product_id: 12, alert_type: 'Reorder', status: 'Active',
      is_resolved: false, batch_number: null,
      product: { product_id: 12, product_name: 'Copper Wire', stock_quantity: 3, min_stock_quantity: 2, reorder_level: 3, expiry_date: null, batch_no: null, status: 'active' },
    },
    {
      alert_id: 4, product_id: 13, alert_type: 'Near Expiry', status: 'Active',
      is_resolved: false, batch_number: 'BATCH-001',
      product: { product_id: 13, product_name: 'Lubricant Oil', stock_quantity: 10, min_stock_quantity: 2, reorder_level: 3, expiry_date: '2025-08-10', batch_no: 'BATCH-001', status: 'active' },
    },
    {
      alert_id: 5, product_id: 14, alert_type: 'Expired', status: 'Active',
      is_resolved: false, batch_number: 'BATCH-002',
      product: { product_id: 14, product_name: 'Rust Remover', stock_quantity: 4, min_stock_quantity: 2, reorder_level: 3, expiry_date: '2024-01-01', batch_no: 'BATCH-002', status: 'active' },
    },
    {
      alert_id: 6, product_id: 15, alert_type: 'Low Stock', status: 'Purchase Ordered',
      is_resolved: false, purchase_order_id: 99, batch_number: null,
      product: { product_id: 15, product_name: 'Drill Bit Set', stock_quantity: 1, min_stock_quantity: 5, reorder_level: 3, expiry_date: null, batch_no: null, status: 'active' },
    },
  ];
}

// ── Helper — single catch-all route (same pattern as batch-inventory.spec.js) ─

async function setupAlertsApi(page) {
  let alertsData = makeAlerts();
  const mutations = [];
  const unexpected = [];

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname; // e.g. /api/alerts/summary
    const method = request.method();

    // ── alerts/summary ──────────────────────────────────────────────────────
    if (path.endsWith('/alerts/summary') && method === 'GET') {
      return route.fulfill({ json: MOCK_SUMMARY });
    }

    // ── alerts/generate ─────────────────────────────────────────────────────
    if (path.endsWith('/alerts/generate') && method === 'POST') {
      mutations.push({ method: 'POST', action: 'generate' });
      return route.fulfill({ json: { message: 'Alert generation complete', productsScanned: 10, alertsCreated: 2, alertsAutoResolved: 0 } });
    }

    // ── alerts/:id/resolve ──────────────────────────────────────────────────
    if (path.includes('/alerts/') && path.endsWith('/resolve') && method === 'PUT') {
      const parts = path.split('/');
      const id = parts[parts.indexOf('alerts') + 1];
      mutations.push({ method: 'PUT', action: 'resolve', id });
      alertsData = alertsData.filter(a => String(a.alert_id) !== String(id));
      return route.fulfill({ json: { message: 'Alert resolved successfully.' } });
    }

    // ── alerts list (GET /api/alerts with optional query params) ────────────
    if (/\/api\/alerts\/?$/.test(path) && method === 'GET') {
      const alertType = url.searchParams.get('alert_type');
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      let result = [...alertsData];
      if (alertType) result = result.filter(a => a.alert_type === alertType);
      if (status) result = result.filter(a => a.status === status);
      if (search) {
        result = result.filter(a =>
          a.product?.product_name?.toLowerCase().includes(search) ||
          a.alert_type?.toLowerCase().includes(search) ||
          (a.batch_number || '').toLowerCase().includes(search)
        );
      }
      return route.fulfill({ json: result });
    }

    // ── cheque-alerts (used by PaymentAlertsTab) ────────────────────────────
    if (path.includes('cheque-alerts') && method === 'GET') {
      return route.fulfill({ json: { alerts: [], summary: { total: 0 } } });
    }

    // ── products detail (used by modals) ────────────────────────────────────
    if (path.includes('/products/') && method === 'GET') {
      return route.fulfill({ json: { product_id: 10, product_name: 'Steel Hammer', stock_quantity: 4 } });
    }

    // ── purchase-orders detail (used by View PO modal) ──────────────────────
    if (path.includes('/purchase-orders/') && method === 'GET') {
      return route.fulfill({ json: { po_id: 99, po_number: '99', status: 'Approved', po_items: [], supplier: {} } });
    }

    // ── all other GETs — pass through to real server ──────────────────────
    if (method === 'GET') {
      return route.continue();
    }

    // ── unexpected writes ───────────────────────────────────────────────────
    unexpected.push(`${method} ${request.url()}`);
    return route.abort();
  });

  return { get alertsData() { return alertsData; }, mutations, unexpected };
}

async function gotoAlerts(page) {
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.alerts-container')).toBeVisible({ timeout: 15_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.afterEach(function() {});

// ── A. List Loading ──────────────────────────────────────────────────────────

test.describe('Alerts - List Loading', () => {
  test('alerts page loads and shows all mocked alerts', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.getByRole('heading', { name: 'Alert Center' })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('alert type pills are displayed correctly', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Out of Stock' }).first()).toBeVisible();
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Low Stock' }).first()).toBeVisible();
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Reorder' }).first()).toBeVisible();
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Near Expiry' }).first()).toBeVisible();
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Expired' }).first()).toBeVisible();
  });

  test('product names are displayed in the table', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('tbody')).toContainText('Steel Hammer');
    await expect(page.locator('tbody')).toContainText('Iron Wrench');
    await expect(page.locator('tbody')).toContainText('Lubricant Oil');
    await expect(page.locator('tbody')).toContainText('Rust Remover');
  });

  test('batch number is shown for batched alerts', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.proc-mono').filter({ hasText: 'BATCH-001' })).toBeVisible();
    await expect(page.locator('.proc-mono').filter({ hasText: 'BATCH-002' })).toBeVisible();
  });

  test('alert status pills are displayed correctly', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Active' }).first()).toBeVisible();
    await expect(page.locator('.proc-status-pill').filter({ hasText: 'Purchase Ordered' })).toBeVisible();
  });
});

// ── B. Summary Counts ────────────────────────────────────────────────────────

test.describe('Alerts - Summary Counts', () => {
  test('filter chips show correct counts from summary API', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.alert-chip').filter({ hasText: 'Out Of Stock' }).locator('.alert-chip-count')).toHaveText('2');
    await expect(page.locator('.alert-chip').filter({ hasText: 'Low Stock' }).locator('.alert-chip-count')).toHaveText('3');
    await expect(page.locator('.alert-chip').filter({ hasText: 'Reorder' }).locator('.alert-chip-count')).toHaveText('1');
    await expect(page.locator('.alert-chip').filter({ hasText: 'Near Expiry' }).locator('.alert-chip-count')).toHaveText('2');
    await expect(page.locator('.alert-chip').filter({ hasText: 'Expired' }).locator('.alert-chip-count')).toHaveText('1');
  });

  test('All Alerts chip shows total count', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.alert-chip').filter({ hasText: 'All Alerts' }).locator('.alert-chip-count')).toHaveText('9');
  });

  test('Purchase Ordered chip shows correct count', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('.alert-chip').filter({ hasText: 'Purchase Ordered' }).locator('.alert-chip-count')).toHaveText('1');
  });
});

// ── C. Filter by Alert Type ──────────────────────────────────────────────────

test.describe('Alerts - Filter by Alert Type', () => {
  for (const [chipLabel, alertType, expectedCount] of [
    ['Out Of Stock', 'Out of Stock', 1],
    ['Low Stock',    'Low Stock',    2],
    ['Reorder',      'Reorder',      1],
    ['Near Expiry',  'Near Expiry',  1],
    ['Expired',      'Expired',      1],
  ]) {
    test(`filter by ${chipLabel} shows only matching alerts`, async ({ page }) => {
      await setupAlertsApi(page);
      await gotoAlerts(page);
      await page.locator('.alert-chip').filter({ hasText: chipLabel }).click();
      await expect(page.locator('tbody tr')).toHaveCount(expectedCount);
      await expect(page.locator('tbody')).toContainText(alertType);
    });
  }

  test('clearing filter by clicking All Alerts restores all rows', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('.alert-chip').filter({ hasText: 'Out Of Stock' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.locator('.alert-chip').filter({ hasText: 'All Alerts' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });
});

// ── D. Filter by Status ──────────────────────────────────────────────────────

test.describe('Alerts - Filter by Status', () => {
  test('Purchase Ordered filter shows only Purchase Ordered alerts', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('.alert-chip').filter({ hasText: 'Purchase Ordered' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('Purchase Ordered');
    await expect(page.locator('tbody')).toContainText('Drill Bit Set');
  });

  test('clearing Purchase Ordered filter restores all alerts', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('.alert-chip').filter({ hasText: 'Purchase Ordered' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.locator('.alert-chip').filter({ hasText: 'All Alerts' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });
});

// ── E. Search ────────────────────────────────────────────────────────────────

test.describe('Alerts - Search', () => {
  for (const [query, expectedCount] of [
    ['Steel Hammer', 1],
    ['Lubricant Oil', 1],
    ['Near Expiry', 1],
    ['BATCH-001', 1],
  ]) {
    test(`search "${query}" shows matching rows`, async ({ page }) => {
      await setupAlertsApi(page);
      await gotoAlerts(page);
      await page.locator('#search').fill(query);
      await expect(page.locator('tbody tr')).toHaveCount(expectedCount);
    });
  }

  test('search is case-insensitive for product name', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('#search').fill('steel hammer');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('Steel Hammer');
  });

  test('clearing search restores all rows', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('#search').fill('Steel Hammer');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.locator('#search').fill('');
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });
});

// ── F. Empty State ───────────────────────────────────────────────────────────

test.describe('Alerts - Empty State', () => {
  test('unmatched search shows empty state', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('#search').fill('no-such-product-xyz');
    await expect(page.getByText('No alerts found.', { exact: true })).toBeVisible();
  });

  test('clearing unmatched search restores rows', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.locator('#search').fill('no-such-product-xyz');
    await expect(page.getByText('No alerts found.', { exact: true })).toBeVisible();
    await page.locator('#search').fill('');
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('empty dataset shows no alerts found', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.includes('cheque-alerts')) return route.fulfill({ json: { alerts: [], summary: { total: 0 } } });
      if (path.endsWith('/alerts/summary') && method === 'GET') return route.fulfill({ json: { total: 0 } });
      if (/\/api\/alerts\/?$/.test(path) && method === 'GET') return route.fulfill({ json: [] });
      return route.continue();
    });
    await gotoAlerts(page);
    await expect(page.getByText('No alerts found.', { exact: true })).toBeVisible();
  });
});

// ── G. API Error on Load ─────────────────────────────────────────────────────

test.describe('Alerts - API Error on Load', () => {
  test('API 500 shows error toast and page does not crash', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.includes('cheque-alerts')) return route.fulfill({ json: { alerts: [], summary: { total: 0 } } });
      if (path.endsWith('/alerts/summary') && method === 'GET') return route.fulfill({ json: {} });
      if (/\/api\/alerts\/?$/.test(path) && method === 'GET')
        return route.fulfill({ status: 500, json: { error: 'Server error' } });
      return route.continue();
    });
    await gotoAlerts(page);
    await expect(page.getByText('Unable to load alerts.', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.alerts-container')).toBeVisible();
  });
});

// ── H. Resolve ───────────────────────────────────────────────────────────────

test.describe('Alerts - Resolve', () => {
  test('resolve endpoint is correctly routed and tracked', async ({ page }) => {
    const api = await setupAlertsApi(page);
    await gotoAlerts(page);
    // Use browser fetch so page.route intercepts it
    await page.evaluate(() =>
      fetch('/api/alerts/1/resolve', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' } }).catch(() => {})
    );
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'resolve', id: '1' });
  });

  test('resolve API 500 does not remove alert from list', async ({ page }) => {
    await setupAlertsApi(page);
    const attempts = [];
    await page.route('**/api/alerts/1/resolve', route => {
      attempts.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: 'Resolve failed' } });
    });
    await gotoAlerts(page);
    await expect(page.locator('tbody tr')).toHaveCount(6);
    await page.evaluate(() =>
      fetch('/api/alerts/1/resolve', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' } }).catch(() => {})
    );
    await expect(page.locator('tbody tr')).toHaveCount(6);
    expect(attempts).toEqual(['PUT']);
  });
});

// ── I. Generate ──────────────────────────────────────────────────────────────

test.describe('Alerts - Generate', () => {
  test('generate alerts POST is tracked correctly', async ({ page }) => {
    const api = await setupAlertsApi(page);
    await gotoAlerts(page);
    await page.evaluate(() =>
      fetch('/api/alerts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' } }).catch(() => {})
    );
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'POST', action: 'generate' });
  });
});

// ── J. Alert Type Priority Display ──────────────────────────────────────────

test.describe('Alerts - Alert Type Priority Display', () => {
  test('Out of Stock alert is displayed and not shown as Low Stock or Reorder', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Steel Hammer' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Out of Stock' })).toBeVisible();
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Low Stock' })).toHaveCount(0);
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Reorder' })).toHaveCount(0);
  });

  test('Low Stock alert is displayed and not shown as Reorder', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Iron Wrench' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Low Stock' })).toBeVisible();
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Reorder' })).toHaveCount(0);
  });

  test('Reorder alert is displayed correctly', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Copper Wire' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Reorder' })).toBeVisible();
  });

  test('Near Expiry alert is displayed and not shown as Expired', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Lubricant Oil' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Near Expiry' })).toBeVisible();
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Expired' })).toHaveCount(0);
  });

  test('Expired alert is displayed correctly', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Rust Remover' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Expired' })).toBeVisible();
  });

  test('Purchase Ordered alert is displayed with correct status', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Drill Bit Set' });
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Purchase Ordered' })).toBeVisible();
    await expect(row.locator('.proc-status-pill').filter({ hasText: 'Active' })).toHaveCount(0);
  });

  test('no duplicate Active alert exists for a Purchase Ordered product', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    await expect(page.locator('tbody tr').filter({ hasText: 'Drill Bit Set' })).toHaveCount(1);
  });
});

// ── K. Expired Batch Actions ─────────────────────────────────────────────────

test.describe('Alerts - Expired Batch Actions', () => {
  test('Expired alert row shows Dispose and Batch buttons', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Rust Remover' });
    await expect(row.getByRole('button', { name: 'Dispose' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Batch' })).toBeVisible();
  });

  test('Near Expiry alert row shows Batch button but not Dispose', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Lubricant Oil' });
    await expect(row.getByRole('button', { name: 'Batch' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Dispose' })).toHaveCount(0);
  });

  test('Out of Stock alert row shows Create PO and View buttons', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Steel Hammer' });
    await expect(row.getByRole('button', { name: 'Create PO' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'View' })).toBeVisible();
  });

  test('Purchase Ordered alert row shows View PO button only', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Drill Bit Set' });
    await expect(row.getByRole('button', { name: 'View PO' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Create PO' })).toHaveCount(0);
  });

  test('Dispose modal opens with correct product info', async ({ page }) => {
    await setupAlertsApi(page);
    await gotoAlerts(page);
    const row = page.locator('tbody tr').filter({ hasText: 'Rust Remover' });
    await row.getByRole('button', { name: 'Dispose' }).click();
    await expect(page.locator('.proc-modal')).toBeVisible();
    await expect(page.locator('.proc-modal')).toContainText('Rust Remover');
    await page.locator('.proc-modal-close').click();
    await expect(page.locator('.proc-modal')).toHaveCount(0);
  });
});
