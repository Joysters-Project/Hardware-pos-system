import { test, expect } from '@playwright/test';
import { preparePage, gotoFeature, json, defaultGetBody } from './test.helpers.js';

const baseProfile = {
  username: 'admin', first_name: 'Admin', last_name: 'User', role: 'Admin',
  employee_id: 7, department: 'Management', position: 'Administrator',
  email: 'admin@example.com', phone_no: '0712345678', address: 'Colombo',
  join_date: '2025-01-10', status: 'Active', profile_photo: null,
};

async function setupProfileApi(page) {
  let profile = { ...baseProfile };
  const writes = [];
  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (path === '/api/profile' && method === 'GET') return json(route, profile);
    if (path === '/api/profile' && method === 'PUT') {
      const raw = request.postData() || '';
      writes.push({ method, path, raw });
      profile = { ...profile, first_name: 'Mira', last_name: 'Tester', email: 'mira@example.com', phone_no: '0771234567', address: 'Kandy' };
      return json(route, profile);
    }
    if (path === '/api/profile/change-password' && method === 'POST') {
      const body = request.postDataJSON();
      writes.push({ method, path, body });
      return json(route, { message: 'Changed' });
    }
    if (path === '/api/profile/photo' && method === 'DELETE') {
      writes.push({ method, path });
      profile.profile_photo = null;
      return json(route, { message: 'Removed' });
    }
    if (method === 'GET') return json(route, defaultGetBody(path));
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  return { writes };
}

test.beforeEach(async ({ page }) => preparePage(page));

test.describe('My Profile', () => {
  test('loads account identity and employment information', async ({ page }) => {
    await setupProfileApi(page);
    await gotoFeature(page, '/profile', 'Account Overview');
    await expect(page.getByRole('heading', { name: 'Admin User' })).toBeVisible();
    await expect(page.getByText('EMP-0007')).toBeVisible();
    await expect(page.getByText('admin@example.com')).toBeVisible();
    await expect(page.getByText('Management')).toBeVisible();
  });

  test('validates required names, email, and Sri Lankan phone before saving', async ({ page }) => {
    const api = await setupProfileApi(page);
    await gotoFeature(page, '/profile', 'Account Overview');
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.locator('input[name="first_name"]').fill('');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('First and last name are required').first()).toBeVisible();
    await page.locator('input[name="first_name"]').fill('Mira');
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    expect(await page.locator('input[name="email"]').evaluate(element => element.validity.typeMismatch)).toBe(true);
    expect(api.writes).toEqual([]);
    await page.locator('input[name="email"]').fill('mira@example.com');
    await page.locator('input[name="phone_no"]').fill('12345');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Enter a valid Sri Lankan phone number').first()).toBeVisible();
    expect(api.writes).toEqual([]);
  });

  test('updates valid profile information using multipart form data', async ({ page }) => {
    const api = await setupProfileApi(page);
    await gotoFeature(page, '/profile', 'Account Overview');
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.locator('input[name="first_name"]').fill('Mira');
    await page.locator('input[name="last_name"]').fill('Tester');
    await page.locator('input[name="email"]').fill('mira@example.com');
    await page.locator('input[name="phone_no"]').fill('0771234567');
    await page.locator('textarea[name="address"]').fill('Kandy');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Profile updated successfully').first()).toBeVisible();
    expect(api.writes).toHaveLength(1);
    expect(api.writes[0].raw).toContain('Mira');
    expect(api.writes[0].raw).toContain('mira@example.com');
    await expect(page.getByRole('heading', { name: 'Mira Tester' })).toBeVisible();
  });

  test('validates password rules and submits a valid password change', async ({ page }) => {
    const api = await setupProfileApi(page);
    await gotoFeature(page, '/profile', 'Account Overview');
    await page.getByRole('button', { name: 'Change Password' }).click();
    await page.locator('#current_password').fill('Current1!');
    await page.locator('#new_password').fill('NewPass1!');
    await page.locator('#confirm_password').fill('Mismatch1!');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page.getByText('New passwords must match').first()).toBeVisible();
    expect(api.writes).toEqual([]);
    await page.locator('#confirm_password').fill('NewPass1!');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page.getByText('Password changed successfully').first()).toBeVisible();
    expect(api.writes[0]).toEqual({ method: 'POST', path: '/api/profile/change-password', body: { current_password: 'Current1!', new_password: 'NewPass1!', confirm_password: 'NewPass1!' } });
  });
});
