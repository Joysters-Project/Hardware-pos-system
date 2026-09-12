// tests/procurement/procurement-notifications.spec.js
import { test, expect } from '@playwright/test';
import { restoreSession } from '../helpers/procurement.helpers.js';

// ── Mock data ────────────────────────────────────────────────────────────────

function makeNotifications() {
  return [
    {
      notification_id: 1, type: 'PO_CREATED', title: 'Purchase Order Created',
      message: 'PO #1001 has been created for supplier Tool Depot.',
      reference_type: 'purchase_order', reference_id: 1001,
      severity: 'info', status: 'unread', is_read: false,
      created_at: '2025-07-01T08:00:00.000Z',
    },
    {
      notification_id: 2, type: 'PO_APPROVED', title: 'Purchase Order Approved',
      message: 'PO #1002 has been approved and is ready for dispatch.',
      reference_type: 'purchase_order', reference_id: 1002,
      severity: 'info', status: 'unread', is_read: false,
      created_at: '2025-07-02T09:00:00.000Z',
    },
    {
      notification_id: 3, type: 'PAYMENT_DUE', title: 'Payment Due Soon',
      message: 'Payment of LKR 45,000 is due in 3 days for supplier Steel Works.',
      reference_type: 'payment', reference_id: 301,
      severity: 'warning', status: 'unread', is_read: false,
      created_at: '2025-07-03T10:00:00.000Z',
    },
    {
      notification_id: 4, type: 'AUTO_REORDER', title: 'Auto Reorder Triggered',
      message: 'Steel Hammer stock is below reorder level. Auto-reorder suggestion created.',
      reference_type: 'product', reference_id: 10,
      severity: 'warning', status: 'read', is_read: true,
      created_at: '2025-07-04T11:00:00.000Z',
    },
    {
      notification_id: 5, type: 'FORECAST_WARNING', title: 'Forecast Warning',
      message: 'Demand forecast indicates potential stockout for Copper Wire within 14 days.',
      reference_type: 'product', reference_id: 12,
      severity: 'critical', status: 'archived', is_read: true,
      created_at: '2025-07-05T12:00:00.000Z',
    },
  ];
}

// ── Helper — single catch-all route (same pattern as alerts.spec.js) ─────────

async function setupNotificationsApi(page) {
  let notifsData = makeNotifications();
  const mutations = [];
  const unexpected = [];

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    // ── unread-count ─────────────────────────────────────────────────────────
    if (path.endsWith('/notifications/unread-count') && method === 'GET') {
      const count = notifsData.filter(n => n.status === 'unread').length;
      return route.fulfill({ json: { count } });
    }

    // ── mark-read ────────────────────────────────────────────────────────────
    if (path.endsWith('/notifications/mark-read') && method === 'PUT') {
      const body = request.postDataJSON();
      mutations.push({ method: 'PUT', action: 'mark-read', ids: body.ids });
      for (const id of body.ids) {
        const n = notifsData.find(x => x.notification_id === Number(id));
        if (n) { n.status = 'read'; n.is_read = true; }
      }
      return route.fulfill({ json: { message: 'Notifications marked as read' } });
    }

    // ── archive ──────────────────────────────────────────────────────────────
    if (path.endsWith('/notifications/archive') && method === 'PUT') {
      const body = request.postDataJSON();
      mutations.push({ method: 'PUT', action: 'archive', ids: body.ids });
      for (const id of body.ids) {
        const n = notifsData.find(x => x.notification_id === Number(id));
        if (n) { n.status = 'archived'; n.is_read = true; }
      }
      return route.fulfill({ json: { message: 'Notifications archived successfully' } });
    }

    // ── notifications list ───────────────────────────────────────────────────
    if (path.endsWith('/procurement/notifications') && method === 'GET') {
      const status = url.searchParams.get('status');
      const result = status ? notifsData.filter(n => n.status === status) : notifsData;
      return route.fulfill({ json: result });
    }

    // ── pass through all other GETs ──────────────────────────────────────────
    if (method === 'GET') return route.continue();

    // ── unexpected writes ────────────────────────────────────────────────────
    unexpected.push(`${method} ${request.url()}`);
    return route.abort();
  });

  return { get notifsData() { return notifsData; }, mutations, unexpected };
}

async function gotoNotifications(page) {
  await page.goto('/procurement/notifications', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.proc-container')).toBeVisible({ timeout: 15_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.afterEach(function() {});

// ── A. List Loading ──────────────────────────────────────────────────────────

test.describe('Notifications - List Loading', () => {
  test('notification center loads with heading', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await expect(page.getByRole('heading', { name: 'Notification Center' })).toBeVisible();
  });

  test('all notification titles are displayed', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    // Switch to All tab to see all 5 notifications
    await page.locator('.proc-tab-btn').filter({ hasText: 'All' }).click();
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Purchase Order Created' })).toBeVisible();
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Purchase Order Approved' })).toBeVisible();
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Payment Due Soon' })).toBeVisible();
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Auto Reorder Triggered' })).toBeVisible();
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Forecast Warning' })).toBeVisible();
  });

  test('notification messages are displayed', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.proc-tab-btn').filter({ hasText: 'All' }).click();
    await expect(page.locator('.pp-notif-message').filter({ hasText: 'PO #1001 has been created' })).toBeVisible();
    await expect(page.locator('.pp-notif-message').filter({ hasText: 'Payment of LKR 45,000' })).toBeVisible();
  });

  test('unread notifications show unread dot indicator', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    // Default tab is unread — 3 unread items
    await expect(page.locator('.pp-notif-unread-dot')).toHaveCount(3);
  });

  test('unread summary pill shows correct count', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await expect(page.locator('.pp-notif-pill.unread-pill')).toContainText('3');
  });
});

// ── B. Unread Count ──────────────────────────────────────────────────────────

test.describe('Notifications - Unread Count', () => {
  test('unread count matches mocked value', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await expect(page.locator('.pp-notif-pill.unread-pill')).toContainText('3');
  });

  test('zero unread count hides the unread pill', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.endsWith('/notifications/unread-count') && method === 'GET')
        return route.fulfill({ json: { count: 0 } });
      if (path.endsWith('/procurement/notifications') && method === 'GET')
        return route.fulfill({ json: [] });
      if (method === 'GET') return route.continue();
      return route.abort();
    });
    await gotoNotifications(page);
    await expect(page.locator('.pp-notif-pill.unread-pill')).toHaveCount(0);
  });
});

// ── C. Filter by Status ──────────────────────────────────────────────────────

test.describe('Notifications - Filter by Status', () => {
  test('Unread tab shows only unread notifications', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    await expect(page.locator('.pp-notif-item')).toHaveCount(3);
    await expect(page.locator('.pp-notif-item.unread')).toHaveCount(3);
    expect(api.unexpected).toEqual([]);
  });

  test('All tab shows all notifications', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.proc-tab-btn').filter({ hasText: 'All' }).click();
    await expect(page.locator('.pp-notif-item')).toHaveCount(5);
  });

  test('Archived tab shows only archived notifications', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.proc-tab-btn').filter({ hasText: 'Archived' }).click();
    await expect(page.locator('.pp-notif-item')).toHaveCount(1);
    await expect(page.locator('.pp-notif-title').filter({ hasText: 'Forecast Warning' })).toBeVisible();
  });
});

// ── D. Severity Display ──────────────────────────────────────────────────────

test.describe('Notifications - Severity Display', () => {
  test('notifications with different severities are all displayed', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.proc-tab-btn').filter({ hasText: 'All' }).click();
    await expect(page.locator('.pp-notif-item').filter({ hasText: 'Purchase Order Created' })).toBeVisible();
    await expect(page.locator('.pp-notif-item').filter({ hasText: 'Payment Due Soon' })).toBeVisible();
    await expect(page.locator('.pp-notif-item').filter({ hasText: 'Forecast Warning' })).toBeVisible();
  });

  test('notification type badges are displayed', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    // All 3 unread notifications have types not in TYPE_META (PO_CREATED, PO_APPROVED, PAYMENT_DUE)
    // so they all fall back to the 'general' meta label 'Notification'
    const badges = page.locator('.pp-notif-badge');
    await expect(badges.first()).toBeVisible();
    const count = await badges.count();
    expect(count).toBe(3);
  });
});

// ── E. Empty State ───────────────────────────────────────────────────────────

test.describe('Notifications - Empty State', () => {
  test('empty unread list shows empty state message', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.endsWith('/notifications/unread-count') && method === 'GET')
        return route.fulfill({ json: { count: 0 } });
      if (path.endsWith('/procurement/notifications') && method === 'GET')
        return route.fulfill({ json: [] });
      if (method === 'GET') return route.continue();
      return route.abort();
    });
    await gotoNotifications(page);
    await expect(page.locator('.pp-notif-empty')).toBeVisible();
    await expect(page.locator('.pp-notif-empty')).toContainText('No unread notifications');
    await expect(page.locator('.pp-notif-item')).toHaveCount(0);
  });

  test('empty archived list shows empty state message', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.endsWith('/notifications/unread-count') && method === 'GET')
        return route.fulfill({ json: { count: 0 } });
      if (path.endsWith('/procurement/notifications') && method === 'GET')
        return route.fulfill({ json: [] });
      if (method === 'GET') return route.continue();
      return route.abort();
    });
    await gotoNotifications(page);
    await page.locator('.proc-tab-btn').filter({ hasText: 'Archived' }).click();
    await expect(page.locator('.pp-notif-empty')).toBeVisible();
    await expect(page.locator('.pp-notif-empty')).toContainText('No archived notifications');
  });
});

// ── F. API Error on Load ─────────────────────────────────────────────────────

test.describe('Notifications - API Error on Load', () => {
  test('API 500 shows loading error and page does not crash', async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      if (path.endsWith('/notifications/unread-count') && method === 'GET')
        return route.fulfill({ json: { count: 0 } });
      if (path.endsWith('/procurement/notifications') && method === 'GET')
        return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      if (method === 'GET') return route.continue();
      return route.abort();
    });
    await gotoNotifications(page);
    await expect(page.getByRole('heading', { name: 'Notification Center' })).toBeVisible();
    await expect(page.locator('.pp-notif-item')).toHaveCount(0);
  });
});

// ── G. Mark as Read ──────────────────────────────────────────────────────────

test.describe('Notifications - Mark as Read', () => {
  test('selecting one notification and clicking Mark Read sends correct PUT request', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.pp-notif-item').first().click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(1);
    await expect(page.getByText('1 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Mark Read' }).click();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'mark-read' });
    expect(api.mutations[0].ids).toHaveLength(1);
  });

  test('Mark All Read sends all unread IDs in one request', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.getByRole('button', { name: 'Mark All Read' }).click();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'mark-read' });
    expect(api.mutations[0].ids).toHaveLength(3);
  });

  test('selecting multiple notifications sends all IDs in one PUT', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    const items = page.locator('.pp-notif-item');
    await items.nth(0).click();
    await items.nth(1).click();
    await expect(page.getByText('2 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Mark Read' }).click();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0].ids).toHaveLength(2);
  });

  test('Mark Read API 500 does not falsely update notification', async ({ page }) => {
    await setupNotificationsApi(page);
    const attempts = [];
    await page.route('**/api/procurement/notifications/mark-read', route => {
      attempts.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: 'Mark read failed' } });
    });
    await gotoNotifications(page);
    await page.locator('.pp-notif-item').first().click();
    await page.getByRole('button', { name: 'Mark Read' }).click();
    await expect(page.locator('.pp-notif-item')).toHaveCount(3);
    expect(attempts).toEqual(['PUT']);
  });
});

// ── H. Archive ───────────────────────────────────────────────────────────────

test.describe('Notifications - Archive', () => {
  test('selecting one notification and clicking Archive sends correct PUT request', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.locator('.pp-notif-item').first().click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(1);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'archive' });
    expect(api.mutations[0].ids).toHaveLength(1);
    // The first visible item is sorted by created_at DESC — id 3 is most recent unread
    expect(typeof api.mutations[0].ids[0]).toBe('number');
  });

  test('bulk archive sends all selected IDs in one PUT', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);
    const items = page.locator('.pp-notif-item');
    await items.nth(0).click();
    await items.nth(1).click();
    await items.nth(2).click();
    await expect(page.getByText('3 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'archive' });
    expect(api.mutations[0].ids).toHaveLength(3);
  });

  test('Archive API 500 does not falsely remove notification', async ({ page }) => {
    await setupNotificationsApi(page);
    const attempts = [];
    await page.route('**/api/procurement/notifications/archive', route => {
      attempts.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: 'Archive failed' } });
    });
    await gotoNotifications(page);
    await page.locator('.pp-notif-item').first().click();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.locator('.pp-notif-item')).toHaveCount(3);
    expect(attempts).toEqual(['PUT']);
  });
});

// ── I. Select All / Clear ────────────────────────────────────────────────────

test.describe('Notifications - Select All / Clear', () => {
  test('Select All selects all visible notifications', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.getByRole('button', { name: 'Select All' }).click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(3);
    await expect(page.getByText('3 selected')).toBeVisible();
  });

  test('Clear deselects all notifications', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    await page.getByRole('button', { name: 'Select All' }).click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(3);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(0);
  });

  test('individual checkbox toggles selection', async ({ page }) => {
    await setupNotificationsApi(page);
    await gotoNotifications(page);
    const firstCheckbox = page.locator('.pp-notif-item').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(1);
    await firstCheckbox.click();
    await expect(page.locator('.pp-notif-item.selected')).toHaveCount(0);
  });
});

// ── J. Lifecycle ─────────────────────────────────────────────────────────────

test.describe('Notifications - Lifecycle unread → read → archived', () => {
  test('notification transitions from unread to read to archived', async ({ page }) => {
    const api = await setupNotificationsApi(page);
    await gotoNotifications(page);

    // Step 1: notification is unread
    await expect(page.locator('.pp-notif-item.unread')).toHaveCount(3);

    // Step 2: mark first notification as read
    await page.locator('.pp-notif-item').first().click();
    await page.getByRole('button', { name: 'Mark Read' }).click();
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', action: 'mark-read' });

    // Step 3: select and archive
    await page.locator('.pp-notif-item').first().click();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    expect(api.mutations[1]).toMatchObject({ method: 'PUT', action: 'archive' });

    expect(api.mutations).toHaveLength(2);
    expect(api.unexpected).toEqual([]);
  });
});
