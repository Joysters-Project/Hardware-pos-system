import { test, expect } from '@playwright/test';
import { preparePage, gotoFeature, json, defaultGetBody } from './test.helpers.js';

const activeProject = { project_id: 1, project_name: 'City Hardware Renovation', project_owner: 'Nimal Perera', location: 'Colombo', status: 'Active', start_date: '2026-01-10', deadline: '2026-12-20' };
const product = { product_id: 10, product_name: 'Steel Hammer', product_code: 'HAM-10', barcode: '100010', status: 'active', stock_quantity: 5, unit_price: 900, cost_price: 600, unit_id: 1, unit: { unit_name: 'Piece' }, alternative_units: [] };

async function setupBillingApi(page) {
  const writes = [];
  let dailyItems = [{ item_id: 51, product_id: 10, quantity: 1, receiver_name: 'Site Store', receiver_phone: '0712345678', taken_at: '2026-10-03T08:30:00Z', product: { product_id: 10, product_name: 'Steel Hammer' } }];

  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (path === '/api/projects' && method === 'GET') return json(route, [activeProject]);
    if (path === '/api/projects/active' && method === 'GET') return json(route, [activeProject]);
    if (path === '/api/products' && method === 'GET') return json(route, [product]);
    if (path === '/api/projects/1/items' && method === 'GET') return json(route, dailyItems);
    if (path === '/api/projects/report/daily' && method === 'GET') return json(route, { items: dailyItems });
    if (path === '/api/projects/items' && method === 'POST') {
      const body = request.postDataJSON();
      writes.push({ method, path, body });
      dailyItems = [...dailyItems, { item_id: 52, ...body.items[0], receiver_name: body.receiver_name, receiver_phone: body.receiver_phone, taken_at: '2026-10-03T10:00:00Z', product }];
      return json(route, { message: 'Created' }, 201);
    }
    if (path === '/api/projects/items/51' && method === 'DELETE') {
      const body = request.postDataJSON();
      writes.push({ method, path, body });
      dailyItems = dailyItems.filter(item => item.item_id !== 51);
      return json(route, { message: 'Removed' });
    }
    if (method === 'GET') return json(route, defaultGetBody(path));
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  return { writes };
}

async function openCounter(page) {
  await gotoFeature(page, '/projects', 'Project Management');
  await page.getByRole('button', { name: 'Project Billing Counter' }).click();
  await expect(page.getByText('Billing Counter - Select Project')).toBeVisible();
}

async function selectProjectAndProduct(page) {
  await page.locator('.pt-project-card').filter({ hasText: activeProject.project_name }).click();
  await expect(page.locator('.pt-modal-top-title h2')).toContainText('City Hardware Renovation');
  await page.locator('#searchQ').fill('HAM-10');
  await page.locator('.pt-search-result').filter({ hasText: 'Steel Hammer' }).click();
  await expect(page.locator('.pt-cart-product-name')).toHaveText('Steel Hammer');
}

test.beforeEach(async ({ page }) => preparePage(page));

test.describe('Project Billing Counter', () => {
  test('searches active projects and opens the selected billing workspace', async ({ page }) => {
    await setupBillingApi(page);
    await openCounter(page);
    await page.locator('#projectSearchQ').fill('Nimal');
    await expect(page.locator('.pt-project-card')).toHaveCount(1);
    await page.locator('#projectSearchQ').fill('Missing');
    await expect(page.getByText('No active projects match "Missing"')).toBeVisible();
    await page.locator('#projectSearchQ').fill('');
    await page.locator('.pt-project-card').click();
    await expect(page.getByText('Active Project')).toBeVisible();
  });

  test('creates a valid project transaction with the selected product', async ({ page }) => {
    const api = await setupBillingApi(page);
    await openCounter(page);
    await selectProjectAndProduct(page);
    await page.locator('#quantity').fill('2');
    await page.locator('#receiverName').fill('Kamal Silva');
    await page.locator('#receiverPhone').fill('0712345678');
    await page.getByRole('button', { name: /Create Transaction/ }).click();
    await expect(page.getByText('Transaction created successfully').first()).toBeVisible();
    expect(api.writes[0]).toEqual({ method: 'POST', path: '/api/projects/items', body: { project_id: 1, receiver_name: 'Kamal Silva', receiver_phone: '0712345678', items: [{ product_id: 10, quantity: 2 }] } });
    await expect(page.getByText('3 items sold today')).toBeVisible();
  });

  test('rejects invalid receiver phone numbers without creating a transaction', async ({ page }) => {
    const api = await setupBillingApi(page);
    await openCounter(page);
    await selectProjectAndProduct(page);
    await page.locator('#receiverName').fill('Kamal Silva');
    await page.locator('#receiverPhone').fill('07123');
    await page.getByRole('button', { name: /Create Transaction/ }).click();
    await expect(page.getByText('Must be exactly 10 digits').first()).toBeVisible();
    expect(api.writes).toEqual([]);
  });

  test('blocks quantities above available stock', async ({ page }) => {
    const api = await setupBillingApi(page);
    await openCounter(page);
    await selectProjectAndProduct(page);
    await page.locator('#quantity').fill('6');
    await expect(page.getByText('Insufficient stock. Available: 5').first()).toBeVisible();
    await page.locator('#receiverName').fill('Kamal Silva');
    await page.locator('#receiverPhone').fill('0712345678');
    await page.getByRole('button', { name: /Create Transaction/ }).click();
    expect(api.writes).toEqual([]);
  });

  test('requires a deletion reason before removing a transaction line', async ({ page }) => {
    const api = await setupBillingApi(page);
    await openCounter(page);
    await page.locator('.pt-project-card').click();
    await expect(page.getByText('1 items sold today')).toBeVisible();
    await page.getByTitle('View product details').click();
    await page.getByTitle('Remove').click();
    const confirmRemoval = page.getByRole('button', { name: 'Confirm & Email Admin' });
    await expect(confirmRemoval).toBeDisabled();
    expect(api.writes).toEqual([]);
    await page.getByPlaceholder('Please enter the mandatory reason for deleting this transaction line item...').fill('Incorrect project allocation');
    await confirmRemoval.click();
    await expect(page.getByText(/Transaction line removed/).first()).toBeVisible();
    expect(api.writes[0]).toEqual({ method: 'DELETE', path: '/api/projects/items/51', body: { reason: 'Incorrect project allocation' } });
  });
});
