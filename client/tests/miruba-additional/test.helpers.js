import { expect } from '@playwright/test';
import { restoreSession } from '../helpers/people.helpers.js';

export async function preparePage(page) {
  await restoreSession(page);
}

export async function gotoFeature(page, path, heading) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

export function json(route, body, status = 200) {
  return route.fulfill({ status, json: body });
}

export function defaultGetBody(pathname) {
  if (pathname === '/api/profile') return {};
  if (pathname === '/api/alerts') return [];
  if (pathname === '/api/alerts/summary') return {};
  if (pathname === '/api/procurement/payments/cheque-alerts') return { summary: {}, alerts: [] };
  return {};
}
