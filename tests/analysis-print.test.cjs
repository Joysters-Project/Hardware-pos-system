const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('monthly PDF keeps every day and later sections inside printable pages', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const source = fs.readFileSync(path.join(__dirname, '../client/src/utils/printTemplate.js'), 'utf8');
    await page.addScriptTag({ content: source.replaceAll('export const ', 'const ') + '\nwindow.reportPrint = printWithTemplate; window.reportTable = buildTableHtml;' });
    for (const days of [28, 29, 30, 31]) {
      const popupPromise = page.waitForEvent('popup');
      await page.evaluate(days => {
        const section = (title, columns, rows) => `<h2 class="tpl-section-title">${title}</h2>${window.reportTable({ columns, rows })}`;
        window.reportPrint({
          title: 'Monthly Analysis Report — September 2026',
          subtitle: 'Sales performance and demand baseline',
          paginateAllTables: true,
          contentInset: '10mm',
          contentHtml: section('Monthly Summary', ['Metric', 'Value'], Array.from({ length: 4 }, (_, i) => [`Metric ${i}`, 'Rs. 100.00']))
            + section('Daily Sales', ['Day', 'Bills', 'Sales'], Array.from({ length: days }, (_, i) => [`Day ${i + 1}`, i + 1, `Rs. ${i + 1}.00`]))
            + section('Top Products', ['Rank', 'Product', 'Base-unit Qty', 'Allocated Sales'], Array.from({ length: 20 }, (_, i) => [i + 1, `Product ${i + 1} with a long description that wraps across multiple lines`, 10, 'Rs. 100.00']))
            + section('Next Month Prediction', ['Product', 'Average / Month', 'Predicted Qty', 'Confidence'], [['Last predicted product', 10, 12, 'Low confidence']]),
        });
      }, days);
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      await popup.emulateMedia({ media: 'print' });
      const result = await popup.evaluate(() => {
        const bodies = [...document.querySelectorAll('.tpl-body-content')];
        const rowPage = label => bodies.findIndex(body => [...body.querySelectorAll('tbody tr')].some(row => row.cells[0].textContent === label));
        return {
          pages: bodies.length,
          clipped: bodies.some(body => body.scrollHeight > body.clientHeight || [...body.querySelectorAll('tr')].some(row => row.getBoundingClientRect().bottom > body.getBoundingClientRect().bottom + 1)),
          contentBottom: getComputedStyle(document.querySelector('.tpl-content')).bottom,
          day11Page: rowPage('Day 11'),
          day12Page: rowPage('Day 12'),
          days: [...document.querySelectorAll('tbody tr')].map(row => row.cells[0].textContent).filter(text => /^Day \d+$/.test(text)),
          lastProduct: document.body.textContent.includes('Last predicted product'),
          headers: [...document.querySelectorAll('.tpl-table')].every(table => table.tHead && table.tBodies[0].rows.length),
        };
      });
      assert(result.pages > 1);
      assert.equal(result.clipped, false);
      assert(parseFloat(result.contentBottom) >= 113); // 30mm at Chromium's 96dpi
      assert(result.day12Page > result.day11Page);
      assert.deepEqual(result.days, Array.from({ length: days }, (_, i) => `Day ${i + 1}`));
      assert(result.lastProduct);
      assert(result.headers);
      const pdf = await popup.pdf({ preferCSSPageSize: true });
      assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
      if (days === 31 && process.env.PDF_QA_OUTPUT) fs.writeFileSync(process.env.PDF_QA_OUTPUT, pdf);
      await popup.close();
    }
  } finally {
    await browser.close();
  }
});
