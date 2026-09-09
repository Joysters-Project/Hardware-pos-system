// Shared navigation and controlled API data for inventory browser tests.
import { expect } from '@playwright/test';
export { restoreSession } from './people.helpers.js';

// Each test receives fresh records. UI writes never modify real business records.
export async function setupInventoryApi(page) {
  const data = {
    category: [{ category_id: 1, category_name: 'Tools' }],
    brands: [{ brand_id: 1, brand_name: 'Acme' }],
    units: [{ unit_id: 1, unit_name: 'Piece' }],
    departments: [{ department_id: 1, department_name: 'Workshop', status: 'Active', budget: 10000, remaining_budget: 10000 }],
    products: [{ product_id: 1, product_name: 'Steel Hammer', type: 'Tool', category_id: 1, brand_id: 1, unit_id: 1, unit_price: 900, cost_price: 600, stock_quantity: 12, min_stock_quantity: 2, reorder_level: 3, status: 'active', alternative_units: [] }],
    assets: [{ asset_id: 1, asset_name: 'Workshop Drill', department_id: 1, cost: 2000, purchase_date: '2025-01-10', condition_type: 'Good', status: 'Active' }],
    'batch-inventory': ['Active', 'Expired'].map((status, i) => ({ batch_id: i + 1, batch_number: `BATCH-${i + 1}`, product: { product_name: 'Steel Hammer' }, supplier: { supplier_name: 'Tool Supplier' }, purchase_order: { po_id: 21, po_number: '21' }, purchase_price: 600, received_quantity: 12, remaining_quantity: 4, received_date: '2025-01-10', status })),
  };
  const ids = { category: 'category_id', brands: 'brand_id', units: 'unit_id', products: 'product_id', assets: 'asset_id', 'batch-inventory': 'batch_id', departments: 'department_id' };
  const mutations = [];
  const unexpected = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const [resource, id, action] = new URL(request.url()).pathname.split('/api/')[1].split('/');
    const method = request.method();
    if (!(resource in data)) {
      if (method === 'GET') return route.continue();
      unexpected.push(`${method} ${request.url()}`);
      return route.abort();
    }
    if (method === 'GET') {
      const result = id === 'product' ? data[resource] : id ? data[resource].find(item => item[ids[resource]] === Number(id)) : data[resource];
      return route.fulfill({ json: result ?? {} });
    }
    const body = request.postData() ? request.postDataJSON() : {};
    mutations.push({ resource, id, action, method, body });
    if (action === 'dispose') {
      Object.assign(data[resource].find(item => item[ids[resource]] === Number(id)), { status: 'Disposed', remaining_quantity: 0 });
    } else if (method === 'DELETE') {
      data[resource] = data[resource].filter(item => item[ids[resource]] !== Number(id));
    } else if (id) {
      Object.assign(data[resource].find(item => item[ids[resource]] === Number(id)), body);
    } else {
      data[resource].push({ ...body, [ids[resource]]: 100 });
    }
    await route.fulfill({ json: { message: 'Saved' } });
  });
  return { data, mutations, unexpected };
}

export async function gotoInventory(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.procurement-top-nav')).toBeVisible();
}

export const gotoProducts = page => gotoInventory(page, '/products');
export const gotoCatalog = page => gotoInventory(page, '/catalog');
export const gotoAssets = page => gotoInventory(page, '/assets');
export const gotoBatchInventory = page => gotoInventory(page, '/inventory/batches');
