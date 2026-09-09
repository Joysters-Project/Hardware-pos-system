// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.test' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,   // procurement tests share DB state — run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'finance',
      testMatch: '**/finance/**/*.spec.js',
      use: { ...devices['Desktop Chrome'], timezoneId: 'Asia/Colombo' },
    },
    {
      name: 'inventory',
      testMatch: '**/inventory/**/*.spec.js',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/.auth-state.json',
      },
    },
    // 1. Auth setup — runs first, saves session to file
    {
      name: 'auth-setup',
      testMatch: '**/auth/auth.setup.js',
    },
    // 2. All procurement tests — depend on saved auth state
    {
      name: 'procurement',
      testMatch: '**/procurement/**/*.spec.js',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/.auth-state.json',
      },
    },
    // 3. People module tests (Employees + Departments)
    {
      name: 'people',
      testMatch: '**/people/**/*.spec.js',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/.auth-state.json',
      },
    },
  ],
});
