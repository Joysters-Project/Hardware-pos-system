// tests/auth/auth.setup.js
// Logs in once and saves sessionStorage state so all procurement tests
// can reuse the authenticated session without re-logging in.

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '.auth-state.json');

const BASE_URL   = process.env.BASE_URL   || 'http://localhost:5173';
const USERNAME   = process.env.TEST_USERNAME || 'admin';
const PASSWORD   = process.env.TEST_PASSWORD || 'Admin@123';
const ROLE       = process.env.TEST_ROLE     || 'Admin';

setup('authenticate as admin', async ({ page }) => {
  // 1. Navigate to role select
  await page.goto(BASE_URL + '/');
  await expect(page.getByText('Select Your Role')).toBeVisible();

  // 2. Click the role button (Admin / Manager / Cashier)
  await page.getByRole('button', { name: ROLE }).click();

  // 3. Fill login form — inputs use placeholder text
  await page.getByPlaceholder('Username').fill(USERNAME);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'LOGIN' }).click();

  // 4. Wait for dashboard to confirm successful login
  await page.waitForURL(/\/dashboard\//);
  await expect(page).toHaveURL(/\/dashboard\//);

  // 5. Persist sessionStorage into storageState so tests can reuse it.
  //    Playwright's storageState captures cookies + localStorage by default.
  //    We also inject sessionStorage values via script so the AuthContext
  //    picks them up on page load.
  const sessionData = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      data[key] = sessionStorage.getItem(key);
    }
    return data;
  });

  // Save the browser storage state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });

  // Patch the saved file to also include sessionStorage entries
  // so the AuthContext finds token/role/userName on next page load.
  const { readFileSync, writeFileSync } = await import('fs');
  const state = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));

  // Add sessionStorage entries as localStorage entries too —
  // AuthContext reads from sessionStorage; we replicate them so
  // Playwright's storageState injection (which only restores localStorage)
  // still works. The app also writes to localStorage on login.
  if (!state.origins) state.origins = [];
  let origin = state.origins.find(o => o.origin === BASE_URL);
  if (!origin) {
    origin = { origin: BASE_URL, localStorage: [] };
    state.origins.push(origin);
  }
  for (const [key, value] of Object.entries(sessionData)) {
    const existing = origin.localStorage.find(e => e.name === key);
    if (existing) existing.value = value;
    else origin.localStorage.push({ name: key, value });
  }
  writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
});
