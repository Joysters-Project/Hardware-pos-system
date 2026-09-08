// tests/people/people-navigation.spec.js
// Covers: People heading, nav links, routes, active state, switching, refresh,
//         admin vs manager routes, and unauthenticated redirect.

import { test, expect } from '@playwright/test';
import { restoreSession, gotoEmployees, gotoDepartments } from '../helpers/people.helpers.js';

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

// ─── Top-nav structure ────────────────────────────────────────────────────────

test.describe('People — Top Navigation Structure', () => {

  test('People heading is visible on Employees page', async ({ page }) => {
    await gotoEmployees(page);
    await expect(page.locator('.procurement-title-block h1')).toHaveText('People');
  });

  test('People heading is visible on Departments page', async ({ page }) => {
    await gotoDepartments(page);
    await expect(page.locator('.procurement-title-block h1')).toHaveText('People');
  });

  test('top-nav contains Employees and Departments links', async ({ page }) => {
    await gotoEmployees(page);
    const nav = page.locator('.procurement-top-nav');
    await expect(nav.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Departments' })).toBeVisible();
  });

  test('Employees link is active on /employees', async ({ page }) => {
    await gotoEmployees(page);
    const activeLink = page.locator('.procurement-nav-item.active');
    await expect(activeLink).toContainText('Employees');
  });

  test('Departments link is active on /departments', async ({ page }) => {
    await gotoDepartments(page);
    const activeLink = page.locator('.procurement-nav-item.active');
    await expect(activeLink).toContainText('Departments');
  });

  test('no /people route exists — navigating to /people redirects away', async ({ page }) => {
    await page.goto('/people');
    // ProtectedRoute or router fallback redirects; should NOT stay on /people
    await page.waitForURL(url => !url.pathname.startsWith('/people'), { timeout: 8_000 });
    expect(page.url()).not.toMatch(/\/people$/);
  });

});

// ─── Navigation between pages ─────────────────────────────────────────────────

test.describe('People — Switching Between Pages', () => {

  test('clicking Departments link navigates to /departments', async ({ page }) => {
    await gotoEmployees(page);
    await page.locator('.procurement-top-nav').getByRole('link', { name: 'Departments' }).click();
    await expect(page).toHaveURL(/\/departments$/);
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
  });

  test('clicking Employees link navigates to /employees', async ({ page }) => {
    await gotoDepartments(page);
    await page.locator('.procurement-top-nav').getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('direct navigation to /employees loads correctly', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('direct navigation to /departments loads correctly', async ({ page }) => {
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/departments$/);
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
  });

  test('browser refresh on /employees keeps the page loaded', async ({ page }) => {
    await gotoEmployees(page);
    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('browser refresh on /departments keeps the page loaded', async ({ page }) => {
    await gotoDepartments(page);
    await page.reload();
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
  });

});

// ─── Admin routes ─────────────────────────────────────────────────────────────

test.describe('People — Admin Routes', () => {

  test('/employees is accessible as admin', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('/departments is accessible as admin', async ({ page }) => {
    await page.goto('/departments');
    await page.waitForSelector('.procurement-top-nav', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
  });

  test('admin Employees nav link points to /employees (no /manager prefix)', async ({ page }) => {
    await gotoEmployees(page, 'admin');
    const empLink = page.locator('.procurement-top-nav').getByRole('link', { name: 'Employees' });
    const href = await empLink.getAttribute('href');
    expect(href).toBe('/employees');
  });

  test('admin Departments nav link points to /departments (no /manager prefix)', async ({ page }) => {
    await gotoEmployees(page, 'admin');
    const deptLink = page.locator('.procurement-top-nav').getByRole('link', { name: 'Departments' });
    const href = await deptLink.getAttribute('href');
    expect(href).toBe('/departments');
  });

});

// ─── Unauthenticated access ───────────────────────────────────────────────────

test.describe('People — Unauthenticated Redirect', () => {

  test('unauthenticated access to /employees redirects to login', async ({ browser }) => {
    // Use a fresh context with no stored auth state
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/employees');
    // ProtectedRoute redirects to /login/<role>
    await page.waitForURL(/\/login\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login\//);
    await ctx.close();
  });

  test('unauthenticated access to /departments redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/departments');
    await page.waitForURL(/\/login\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login\//);
    await ctx.close();
  });

});

// ─── Manager routes (using admin session — manager prefix routes) ─────────────
// ProtectedRoute checks role.toLowerCase() === requiredRole.toLowerCase().
// Admin role is "admin", /manager/* routes require "manager" — they differ.
// ProtectedRoute redirects to /login/manager. We assert the URL changed away
// from the manager route (not hardcoding the exact redirect target).

test.describe('People — Manager Route Behavior (admin session)', () => {

  test('/manager/employees with admin session does not stay on that route', async ({ page }) => {
    await page.goto('/manager/employees');
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    // Should be redirected — URL must not end with /manager/employees
    expect(page.url()).not.toMatch(/\/manager\/employees$/);
  });

  test('/manager/departments with admin session does not stay on that route', async ({ page }) => {
    await page.goto('/manager/departments');
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    expect(page.url()).not.toMatch(/\/manager\/departments$/);
  });

});
