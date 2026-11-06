import { test, expect } from '@playwright/test';
import { preparePage, gotoFeature, json, defaultGetBody } from './test.helpers.js';

const baseProject = {
  project_id: 1,
  project_name: 'City Hardware Renovation',
  project_owner: 'Nimal Perera',
  location: 'Colombo',
  description: 'Retail floor renovation',
  status: 'Active',
  start_date: '2026-01-10',
  deadline: '2026-12-20',
  end_date: null,
  final_cost: null,
};

async function setupProjectsApi(page) {
  let projects = [{ ...baseProject }];
  const mutations = [];

  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/projects' && method === 'GET') return json(route, projects);
    if (path === '/api/projects/1' && method === 'GET') {
      return json(route, { ...projects[0], items: [{ item_id: 11, quantity: 2, unit_price: 900, taken_at: '2026-10-02T08:00:00Z', product: { product_name: 'Steel Hammer' }, receiver_name: 'Site Store' }] });
    }
    if (path === '/api/projects' && method === 'POST') {
      const body = request.postDataJSON();
      mutations.push({ method, path, body });
      projects = [...projects, { ...body, project_id: 2 }];
      return json(route, { project_id: 2 }, 201);
    }
    if (path === '/api/projects/1' && method === 'PUT') {
      const body = request.postDataJSON();
      mutations.push({ method, path, body });
      projects[0] = { ...projects[0], ...body, final_cost: body.final_payment };
      return json(route, projects[0]);
    }
    if (path === '/api/projects/1' && method === 'DELETE') {
      mutations.push({ method, path });
      projects = projects.filter(project => project.project_id !== 1);
      return json(route, { message: 'Deleted' });
    }
    if (path === '/api/projects/report/monthly') {
      return json(route, { totalValue: 1800, totalItems: 2, totalProjectIncome: 2500, byProject: [{ project: baseProject, totalQty: 2, items: [] }] });
    }
    if (path === '/api/projects/report/yearly') {
      return json(route, { totalValue: 1800, totalItems: 2, totalProjectIncome: 2500, byMonth: [{ month: 10, totalValue: 1800, totalItems: 2, projectIncome: 2500 }] });
    }
    if (method === 'GET') return json(route, defaultGetBody(path));
    throw new Error(`Unexpected request: ${method} ${path}`);
  });

  return { mutations, get projects() { return projects; } };
}

test.beforeEach(async ({ page }) => preparePage(page));

test.describe('Projects - Management', () => {
  test('loads project statistics and detailed item information', async ({ page }) => {
    await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    await expect(page.getByText('Total Projects').locator('..')).toContainText('1');
    await expect(page.getByText('City Hardware Renovation', { exact: true })).toBeVisible();
    await page.getByTitle('View').click();
    await expect(page.getByRole('heading', { name: /City Hardware Renovation/ })).toBeVisible();
    await expect(page.getByText('LKR 1,800.00')).toBeVisible();
    await page.getByRole('button', { name: /Items Taken/ }).click();
    await page.locator('.proj-items-month-header').click();
    await expect(page.getByText('Steel Hammer')).toBeVisible();
  });

  test('creates a project and converts display dates to API dates', async ({ page }) => {
    const api = await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.locator('#project_name').fill('Warehouse Extension');
    await page.locator('#project_owner').fill('Kamal Silva');
    await page.locator('#location').fill('Kandy');
    await page.locator('#start_date').fill('01092026');
    await page.locator('#deadline').fill('30112026');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Project created').first()).toBeVisible();
    expect(api.mutations[0]).toMatchObject({ method: 'POST', path: '/api/projects', body: { project_name: 'Warehouse Extension', start_date: '2026-09-01', deadline: '2026-11-30' } });
    await expect(page.getByText('Warehouse Extension', { exact: true })).toBeVisible();
  });

  test('rejects an invalid calendar date without calling the API', async ({ page }) => {
    const api = await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.locator('#project_name').fill('Invalid Date Project');
    await page.locator('#start_date').fill('31022026');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Use dd/mm/yyyy for all project dates').first()).toBeVisible();
    expect(api.mutations).toEqual([]);
  });

  test('requires final payment when completing a project and updates valid data', async ({ page }) => {
    const api = await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    await page.getByTitle('Edit').click();
    await expect(page.getByRole('heading', { name: 'Edit Project' })).toBeVisible();
    await page.locator('#status').selectOption('Completed');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Please enter the final payment amount before closing the project').first()).toBeVisible();
    expect(api.mutations).toEqual([]);
    await page.locator('#final_payment').fill('250000');
    await page.locator('#end_date').fill('02102026');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Project updated').first()).toBeVisible();
    expect(api.mutations[0]).toMatchObject({ method: 'PUT', body: { status: 'Completed', final_payment: '250000', end_date: '2026-10-02' } });
  });

  test('cancels deletion safely and deletes only after confirmation', async ({ page }) => {
    const api = await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByTitle('Delete').click();
    expect(api.mutations).toEqual([]);
    page.once('dialog', dialog => dialog.accept());
    await page.getByTitle('Delete').click();
    await expect(page.getByText('Project deleted').first()).toBeVisible();
    expect(api.mutations).toEqual([{ method: 'DELETE', path: '/api/projects/1' }]);
    await expect(page.getByText('No projects yet. Create one to get started.')).toBeVisible();
  });
});

test.describe('Projects - Reports', () => {
  test('loads monthly and yearly project summaries', async ({ page }) => {
    await setupProjectsApi(page);
    await gotoFeature(page, '/projects', 'Project Management');
    await page.getByRole('button', { name: 'Monthly Report' }).click();
    await expect(page.getByText('Project Income').first()).toBeVisible();
    await expect(page.getByText('LKR 2,500.00').first()).toBeVisible();
    await page.getByRole('button', { name: 'Yearly Report' }).click();
    await expect(page.getByText('Oct', { exact: true })).toBeVisible();
    await expect(page.getByText('2 items')).toBeVisible();
  });
});
