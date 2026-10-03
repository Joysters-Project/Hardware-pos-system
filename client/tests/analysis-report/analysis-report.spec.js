import { test, expect } from '@playwright/test';
import { restoreSession } from '../helpers/people.helpers.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthlyFixture = {
  summary: { totalRevenue: 125000, totalBills: 24, prevRevenue: 100000, revenueGrowth: 25 },
  topProducts: [{ productId: 10, name: 'Steel Hammer', qty: 30, revenue: 45000 }],
  dailyRevenue: [{ day: 1, bills: 2, revenue: 5000 }, { day: 2, bills: 3, revenue: 7500 }],
  nextMonthPredictions: [{ productId: 10, name: 'Steel Hammer', avgMonthlyQty: 20, predictedNextMonth: 22, trend: 'high', confidence: { level: 'high', activeMonths: 3, billCount: 18 } }],
  forecastConfidence: { level: 'high', monthsWithSales: 3, monthsRequired: 3, billCount: 18, periodStart: '2026-07-01', periodEnd: '2026-09-30' },
  period: { year: 2026, month: 9, monthName: 'October' },
};

const monthlySeries = monthNames.map((month, index) => ({ month, revenue: index === 0 ? 45000 : 0 }));
const yearlyFixture = {
  summary: { totalRevenue: 480000, totalBills: 96, totalExpenses: 120000, salesLessExpenses: 360000, prevRevenue: 400000, revenueGrowth: 20 },
  monthlyData: monthlySeries,
  prevMonthlyData: monthNames.map(month => ({ month, revenue: 30000 })),
  topProducts: [{ productId: 10, name: 'Steel Hammer', qty: 140, revenue: 180000 }],
  prediction: { nextYearRevenue: 480000, growthRate: 0 },
  nextYearMonthlyTopProducts: monthNames.map((month, index) => ({ month, available: index < 2, products: index < 2 ? [{ productId: 10, name: 'Steel Hammer', predictedQty: 12 }] : [] })),
  improvements: [{ type: 'success', text: 'Maintain stock availability for the strongest products.' }],
  performanceHighlights: {
    comparisonMonths: 12,
    strongestMonth: { month: 'January', monthIndex: 0, revenue: 80000, bills: 14 },
    weakestMonth: { month: 'February', monthIndex: 1, revenue: 15000, bills: 4 },
    fastestGrowingProduct: { productId: 10, name: 'Steel Hammer', growthPercent: 35 },
    decliningProducts: [{ productId: 11, name: 'Paint Brush', growthPercent: -20 }],
  },
  period: { year: 2026, prevYear: 2025, incomplete: false },
};

const detailFixture = {
  summary: { billCount: 1, billTotal: 9000, matchedQuantity: 2, allocatedRevenue: 7200 },
  bills: [{ billId: 501, billNo: 'INV-501', date: '2026-10-01T08:30:00Z', customer: 'Nimal Perera', status: 'PAID', billTotal: 9000, items: [{ name: 'Steel Hammer', qty: 2, allocatedRevenue: 7200 }] }],
};

async function setupAnalysisApi(page, { failMonthly = false, failYearly = false, failDetails = false } = {}) {
  const requests = [];
  await page.route('http://localhost:5000/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/analysis/monthly') {
      const query = Object.fromEntries(url.searchParams);
      requests.push({ path, query });
      if (failMonthly) return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      const year = Number(query.year);
      const month = Number(query.month);
      return route.fulfill({ json: { ...monthlyFixture, period: { year, month, monthName: monthNames[month] } } });
    }
    if (path === '/api/analysis/yearly') {
      const query = Object.fromEntries(url.searchParams);
      requests.push({ path, query });
      if (failYearly) return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      const year = Number(query.year);
      return route.fulfill({ json: { ...yearlyFixture, period: { year, prevYear: year - 1, incomplete: false } } });
    }
    if (path === '/api/analysis/details') {
      const query = Object.fromEntries(url.searchParams);
      requests.push({ path, query });
      if (failDetails) return route.fulfill({ status: 500, json: { error: 'Unavailable' } });
      return route.fulfill({ json: detailFixture });
    }
    if (path === '/api/profile') return route.fulfill({ json: {} });
    if (path === '/api/alerts') return route.fulfill({ json: [] });
    if (path === '/api/alerts/summary') return route.fulfill({ json: {} });
    if (path === '/api/procurement/payments/cheque-alerts') return route.fulfill({ json: { summary: {}, alerts: [] } });
    return route.fulfill({ json: {} });
  });
  return { requests };
}

async function gotoAnalysis(page, query = '') {
  await page.goto(`/analysis-report${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Analysis Report' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await restoreSession(page);
});

test.describe('Analysis Report - Monthly', () => {
  test('loads monthly KPIs, daily sales, top products, and forecast confidence', async ({ page }) => {
    await setupAnalysisApi(page);
    await gotoAnalysis(page);
    await expect(page.locator('.ar-kpi-card')).toHaveCount(4);
    await expect(page.locator('.ar-kpi-card').filter({ hasText: 'Total Revenue' })).toContainText('Rs. 125.0K');
    await expect(page.locator('.ar-kpi-card').filter({ hasText: 'Total Bills' })).toContainText('24');
    await expect(page.getByText('Steel Hammer', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('High confidence').first()).toBeVisible();
    await expect(page.getByText('3 of 3 months contain sales')).toBeVisible();
    await expect(page.getByText('Predicted:').locator('..')).toContainText('22');
  });

  test('changes year and month and sends the selected period to the API', async ({ page }) => {
    const api = await setupAnalysisApi(page);
    await gotoAnalysis(page);
    const selects = page.locator('.ar-period-selects select');
    await selects.nth(0).selectOption('2025');
    await selects.nth(1).selectOption('0');
    await expect(page.getByText('January 2025', { exact: true }).first()).toBeVisible();
    await expect.poll(() => api.requests.some(item => item.path === '/api/analysis/monthly' && item.query.year === '2025' && item.query.month === '0')).toBe(true);
  });

  test('hides and restores monthly product and forecast sections', async ({ page }) => {
    await setupAnalysisApi(page);
    await gotoAnalysis(page);
    const topProducts = page.locator('.ar-section-card').filter({ hasText: 'Top Selling Products This Month' });
    await topProducts.getByRole('button', { name: 'Hide' }).click();
    await expect(topProducts.getByText('Steel Hammer', { exact: true })).toHaveCount(0);
    await topProducts.getByRole('button', { name: 'View' }).click();
    await expect(topProducts.getByText('Steel Hammer', { exact: true })).toBeVisible();
  });

  test('opens supporting bill details for a product and closes with Escape', async ({ page }) => {
    const api = await setupAnalysisApi(page);
    await gotoAnalysis(page);
    await page.locator('.ar-product-row').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('INV-501')).toBeVisible();
    await expect(page.getByText('Nimal Perera')).toBeVisible();
    await expect(page.locator('.ar-detail-summary').getByText('Rs. 7,200.00', { exact: true })).toBeVisible();
    await expect.poll(() => api.requests.some(item => item.path === '/api/analysis/details' && item.query.productId === '10')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('shows a safe error inside the detail dialog when evidence cannot load', async ({ page }) => {
    await setupAnalysisApi(page, { failDetails: true });
    await gotoAnalysis(page);
    await page.locator('.ar-product-row').click();
    await expect(page.getByText('Failed to load the supporting bill details.')).toBeVisible();
  });

  test('exports the monthly report to printable PDF and Excel-compatible CSV', async ({ page, context }) => {
    await setupAnalysisApi(page);
    await gotoAnalysis(page);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const reportPage = await popupPromise;
    await expect(reportPage.getByRole('heading', { name: /Monthly Analysis Report/ })).toBeVisible();
    await expect(reportPage.getByText('Steel Hammer', { exact: true }).first()).toBeVisible();
    await reportPage.close();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel (CSV)' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^monthly-analysis-\d{4}-\d{2}\.csv$/);
  });
});

test.describe('Analysis Report - Yearly', () => {
  test('switches through URL state and displays annual KPIs and highlights', async ({ page }) => {
    await setupAnalysisApi(page);
    await gotoAnalysis(page);
    await page.getByRole('button', { name: 'Yearly Analysis' }).click();
    await expect(page).toHaveURL(/view=yearly/);
    await expect(page.getByText('Full Year 2026')).toBeVisible();
    await expect(page.locator('.ar-kpi-card').filter({ hasText: 'Total Expenses' })).toContainText('Rs. 120.0K');
    await expect(page.locator('.ar-kpi-card').filter({ hasText: 'Sales Less Recorded Expenses' })).toContainText('Rs. 360.0K');
    await expect(page.getByRole('button', { name: /Strongest month/ })).toContainText('January');
    await expect(page.getByText('Maintain stock availability for the strongest products.')).toBeVisible();
  });

  test('reveals next-year monthly forecasts and opens their bill evidence', async ({ page }) => {
    const api = await setupAnalysisApi(page);
    await gotoAnalysis(page, '?view=yearly');
    const forecastSection = page.locator('.ar-section-card').filter({ hasText: 'Top 3 Products to Prepare Each Month' });
    await forecastSection.getByRole('button', { name: 'View' }).click();
    await expect(forecastSection.getByRole('button', { name: /Steel Hammer/ }).first()).toBeVisible();
    await forecastSection.getByRole('button', { name: /Steel Hammer/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(() => api.requests.some(item => item.path === '/api/analysis/details' && item.query.month === '0' && item.query.productId === '10')).toBe(true);
  });

  test('changes the selected year and requests the correct annual period', async ({ page }) => {
    const api = await setupAnalysisApi(page);
    await gotoAnalysis(page, '?view=yearly');
    await page.locator('.ar-period-selects select').selectOption('2025');
    await expect(page.getByText('Full Year 2025')).toBeVisible();
    await expect.poll(() => api.requests.some(item => item.path === '/api/analysis/yearly' && item.query.year === '2025')).toBe(true);
  });
});

test.describe('Analysis Report - API Failures', () => {
  test('shows monthly and yearly load failures without rendering stale data', async ({ page }) => {
    await setupAnalysisApi(page, { failMonthly: true, failYearly: true });
    await gotoAnalysis(page);
    await expect(page.getByText('Failed to load monthly analysis.')).toBeVisible();
    await page.getByRole('button', { name: 'Yearly Analysis' }).click();
    await expect(page.getByText('Failed to load yearly analysis.')).toBeVisible();
    await expect(page.locator('.ar-kpi-card')).toHaveCount(0);
  });
});
