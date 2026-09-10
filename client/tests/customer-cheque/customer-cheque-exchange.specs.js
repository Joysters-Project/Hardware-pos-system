import { test as base, expect } from '@playwright/test';

const test = base.extend({
  exchange: async ({ page }, use) => {
    const state = { customers: [{ customer_id: 1, customer_name: 'Amal Perera', nic_number: '199012345678', phone_number: '0771234567', address: 'Colombo' }], cheques: [], writes: [], fail: false };
    await page.clock.setFixedTime(new Date('2026-09-10T00:30:00+05:30'));
    await page.addInitScript(() => {
      for (const storage of [sessionStorage, localStorage]) {
        storage.setItem('token', 'cheque-test'); storage.setItem('role', 'admin');
        storage.setItem('userName', 'Cheque Test'); storage.setItem('loginTime', String(Date.now()));
      }
    });
    await page.route('**/api/**', async route => {
      const req = route.request();
      const pathname = new URL(req.url()).pathname;
      if (!pathname.startsWith('/api/')) return route.continue();
      const path = pathname.split('/api/cheque-exchange')[1];
      if (path === undefined) return route.fulfill({ json: {} });
      if (state.fail) return route.fulfill({ status: 500, json: { message: 'Exchange service unavailable' } });
      const collection = path.startsWith('/customers') ? 'customers' : 'cheques';
      const key = collection === 'customers' ? 'customer_id' : 'cheque_id';
      const id = Number(path.split('/')[collection === 'customers' ? 2 : 1]);
      if (req.method() !== 'GET') {
        const body = req.postDataJSON() || {};
        state.writes.push({ method: req.method(), path, body });
        if (req.method() === 'POST') state[collection].push({ ...body, [key]: 99, cheque_status: 'Pending', repayment_status: 'Not Required', customer: state.customers[0] });
        else if (req.method() === 'DELETE') state[collection] = state[collection].filter(r => r[key] !== id);
        else state[collection] = state[collection].map(r => r[key] === id ? { ...r, ...body, ...(body.cheque_status === 'Bounced' ? { repayment_status: 'Pending' } : {}), ...(path.endsWith('/repayment') ? { repayment_status: 'Paid' } : {}) } : r);
        return route.fulfill({ json: { message: 'Saved' } });
      }
      let data = state.cheques;
      if (path === '/customers') data = state.customers;
      if (path.startsWith('/customers/')) data = { ...state.customers.find(r => r.customer_id === id), cheques: state.cheques };
      if (path === '/banks') data = ['Sampath Bank'];
      if (path === '/dashboard') data = { total_customers: state.customers.length, total_cheques: state.cheques.length };
      return route.fulfill({ json: { data } });
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await use(state);
    expect(errors).toEqual([]);
  },
});

test.beforeEach(async ({ page, exchange }) => {
  expect(exchange).toBeTruthy();
  await page.goto('/customer-cheque-exchange');
  await expect(page.locator('.cce-table')).toContainText('Amal Perera');
});

async function fillCheque(page) {
  await page.getByRole('button', { name: 'Record cheque', exact: true }).first().click();
  const customer = page.getByPlaceholder('Type customer name and select');
  await customer.fill('Amal'); await customer.press('ArrowDown'); await customer.press('Enter');
  for (const [id, value] of Object.entries({ cheque_number: 'CHQ-1001', bank_name: 'Sampath Bank', account_holder_name: 'Amal Perera', cheque_amount: '100000', cheque_date: '2026-09-10', expected_clearance_date: '2026-09-15' })) await page.locator(`#${id}`).fill(value);
}

test('customer create, edit, view and delete', async ({ page, exchange }) => {
  await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
  for (const [id, value] of Object.entries({ customer_name: 'Nimal Silva', nic_number: '198512345678', phone_number: '0777654321', address: 'Kandy' })) await page.locator(`#${id}`).fill(value);
  await page.getByRole('button', { name: 'Save customer' }).click();
  const row = page.locator('.cce-table tbody tr').filter({ hasText: 'Nimal Silva' });
  await row.getByTitle('Edit customer').click();
  await expect(page.getByRole('heading', { name: 'Edit customer' })).toBeVisible();
  await page.locator('#address').fill('Galle');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(row).toContainText('Galle');
  await row.getByTitle('View details').click();
  await expect(page.locator('.cce-modal')).toContainText('Galle');
  await page.locator('.cce-modal-close').click();
  page.once('dialog', d => d.accept());
  await row.getByTitle('Delete customer').click();
  await expect(row).toHaveCount(0);
  expect(exchange.writes.map(w => w.method)).toEqual(['POST', 'PUT', 'DELETE']);
});

test('invalid NIC prevents submission', async ({ page, exchange }) => {
  await page.getByTitle('Edit customer').click();
  await page.locator('#nic_number').fill('123');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByText('NIC number must be 9 digits + V/X or 12 digits')).toBeVisible();
  expect(exchange.writes).toEqual([]);
});

test('new cheque defaults to local today and five percent discount', async ({ page }) => {
  await fillCheque(page);
  await expect(page.locator('#discount_percentage')).toHaveValue('5');
  await expect(page.locator('.cce-modal input[type=date]').last()).toHaveValue('2026-09-10');
});

test('cheque create, edit, deposit, bounce, repay and delete', async ({ page, exchange }) => {
  await fillCheque(page);
  await page.getByRole('button', { name: 'Save cheque' }).click();
  await expect(page.getByText('Cheque recorded successfully')).toBeVisible();
  expect(exchange.writes[0].body).toMatchObject({ customer_id: '1', cheque_amount: 100000, discount_percentage: 5 });
  await page.getByRole('button', { name: 'Cheque management', exact: true }).click();
  const row = page.locator('.cce-table tbody tr').filter({ hasText: 'CHQ-1001' });
  await row.getByTitle('Edit cheque').click();
  await page.locator('#remarks').fill('Updated note');
  await page.getByRole('button', { name: 'Update cheque' }).click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
  await row.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(page.getByText('Cheque marked as deposited')).toBeVisible();
  await row.getByRole('combobox').selectOption('Bounced');
  await row.getByRole('button', { name: 'Repayment', exact: true }).click();
  await expect(row).toContainText('Paid');
  await page.reload();
  await page.getByRole('button', { name: 'Cheque management', exact: true }).click();
  await expect(row).toContainText('Paid');
  page.once('dialog', d => d.accept());
  await row.getByTitle('Delete cheque').click();
  await expect(page.getByText('No cheques found.')).toBeVisible();
  expect(exchange.writes.map(w => w.method)).toEqual(['POST', 'PUT', 'PATCH', 'PATCH', 'PATCH', 'DELETE']);
});

test('save error retains values and allows retry', async ({ page, exchange }) => {
  await fillCheque(page);
  exchange.fail = true;
  await page.getByRole('button', { name: 'Save cheque' }).click();
  await expect(page.getByText('Exchange service unavailable')).toBeVisible();
  await expect(page.locator('#cheque_number')).toHaveValue('CHQ-1001');
  exchange.fail = false;
  await page.getByRole('button', { name: 'Save cheque' }).click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
});

test('empty report and PDF download', async ({ page }) => {
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByText('No report rows available.')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('customer-cheque-exchange-pending.pdf');
  expect(await download.failure()).toBeNull();
});


// Exercise both forms: validation must prevent requests on create and update.
for (const mode of ['add', 'edit']) {
  for (const [field, value, message] of [
    ['customer_name', '1', 'Customer name must be at least 2 letters and may include spaces, dots, apostrophes, or hyphens'],
    ['nic_number', '123ABC', 'NIC number must be 9 digits + V/X or 12 digits'],
    ['phone_number', 'abc123', 'Phone number must be valid, e.g. 0771234567 or +94771234567'],
    ['address', '   ', 'Customer name, NIC, phone, and address are required'],
  ]) {
    test(`${mode} customer rejects invalid ${field}`, async ({ page, exchange }) => {
      if (mode === 'add') await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
      else await page.getByTitle('Edit customer').click();
      for (const [id, text] of Object.entries({ customer_name: 'Nimal Silva', nic_number: '198512345678', phone_number: '0777654321', address: 'Kandy' })) await page.locator(`#${id}`).fill(text);
      await page.locator(`#${field}`).fill(value);
      await page.getByRole('button', { name: 'Save customer' }).click();
      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect(page.locator('.cce-modal')).toBeVisible();
      expect(exchange.writes).toEqual([]);
    });
  }
}

for (const field of ['customer_name', 'nic_number', 'phone_number', 'address']) {
  test(`customer requires ${field}`, async ({ page, exchange }) => {
    await page.getByTitle('Edit customer').click();
    await page.locator(`#${field}`).fill('');
    await page.getByRole('button', { name: 'Save customer' }).click();
    expect(await page.locator(`#${field}`).evaluate(el => el.validity.valueMissing)).toBe(true);
    expect(exchange.writes).toEqual([]);
  });
}

test('customer edit prefills values and cancel discards changes', async ({ page, exchange }) => {
  await page.getByTitle('Edit customer').click();
  for (const field of ['customer_name', 'nic_number', 'phone_number', 'address']) await expect(page.locator(`#${field}`)).toHaveValue(exchange.customers[0][field]);
  await page.locator('#customer_name').fill('Unsaved Name');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.cce-table')).toContainText('Amal Perera');
  await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
  await expect(page.locator('#customer_name')).toHaveValue('');
  await page.locator('.cce-modal-close').click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
  expect(exchange.writes).toEqual([]);
});

test('customer accepts legacy NIC and trims submitted values', async ({ page, exchange }) => {
  await page.getByTitle('Edit customer').click();
  await page.locator('#customer_name').fill('  Amal Perera  ');
  await page.locator('#nic_number').fill('901234567V');
  await page.locator('#phone_number').fill('+94771234567');
  await page.locator('#address').fill('  Galle  ');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
  expect(exchange.writes[0]).toMatchObject({ method: 'PUT', path: '/customers/1', body: { customer_name: 'Amal Perera', nic_number: '901234567V', phone_number: '+94771234567', address: 'Galle' } });
  await page.reload();
  await expect(page.locator('.cce-table')).toContainText('Galle');
});

test('customer view shows identity and empty cheque history', async ({ page, exchange }) => {
  await page.getByTitle('View details').click();
  const modal = page.locator('.cce-modal');
  await expect(page.getByRole('heading', { name: 'Customer details' })).toBeVisible();
  for (const field of ['customer_name', 'nic_number', 'phone_number', 'address']) await expect(modal).toContainText(exchange.customers[0][field]);
  await expect(modal).toContainText('No cheque history found.');
  await page.locator('.cce-modal-close').click();
  expect(exchange.writes).toEqual([]);
});

for (const action of ['view', 'edit', 'delete']) {
  test(`customer ${action} handles API failure without losing record`, async ({ page, exchange }) => {
    if (action === 'edit') {
      await page.getByTitle('Edit customer').click();
      await page.locator('#address').fill('Changed address');
    }
    exchange.fail = true;
    if (action === 'delete') page.once('dialog', d => d.accept());
    if (action === 'edit') await page.getByRole('button', { name: 'Save customer' }).click();
    else await page.getByTitle(action === 'view' ? 'View details' : 'Delete customer').click();
    await expect(page.getByText('Exchange service unavailable')).toBeVisible();
    expect(exchange.customers[0].address).toBe('Colombo');
    if (action === 'edit') await expect(page.locator('#address')).toHaveValue('Changed address');
    else await expect(page.locator('.cce-modal')).toHaveCount(0);
    expect(exchange.writes).toEqual([]);
  });
}

test('declining customer deletion keeps record', async ({ page, exchange }) => {
  page.once('dialog', d => d.dismiss());
  await page.getByTitle('Delete customer').click();
  await expect(page.locator('.cce-table')).toContainText('Amal Perera');
  expect(exchange.writes).toEqual([]);
});

for (const field of ['cheque_number', 'bank_name', 'account_holder_name', 'cheque_amount', 'cheque_date', 'expected_clearance_date']) {
  test(`cheque requires ${field}`, async ({ page, exchange }) => {
    await fillCheque(page);
    await page.locator(`#${field}`).fill('');
    await page.getByRole('button', { name: 'Save cheque' }).click();
    expect(await page.locator(`#${field}`).evaluate(el => el.validity.valueMissing)).toBe(true);
    expect(exchange.writes).toEqual([]);
  });
}

test('typing customer without selecting prevents cheque submission', async ({ page, exchange }) => {
  await fillCheque(page);
  await page.getByPlaceholder('Type customer name and select').fill('Amal Perer');
  await page.getByRole('button', { name: 'Save cheque' }).click();
  await expect(page.getByText('Please complete all required cheque fields')).toBeVisible();
  expect(exchange.writes).toEqual([]);
});

test('future received date prevents cheque submission', async ({ page, exchange }) => {
  await fillCheque(page);
  const received = page.locator('.cce-modal input[type=date]').last();
  await received.fill('2026-09-11');
  await page.getByRole('button', { name: 'Save cheque' }).click();
  expect(await received.evaluate(el => el.validity.rangeOverflow)).toBe(true);
  expect(exchange.writes).toEqual([]);
});

async function createCheque(page) {
  await fillCheque(page);
  await page.getByRole('button', { name: 'Save cheque' }).click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cheque management', exact: true }).click();
  return page.locator('.cce-table tbody tr').filter({ hasText: 'CHQ-1001' });
}

test('cheque edit prefills values, saves changes and survives reload', async ({ page, exchange }) => {
  const row = await createCheque(page);
  await row.getByTitle('Edit cheque').click();
  await expect(page.locator('#cheque_amount')).toHaveValue('100000');
  await expect(page.getByPlaceholder('Type customer name and select')).toHaveValue('Amal Perera');
  await page.locator('#cheque_amount').fill('125000');
  await page.locator('#discount_percentage').fill('3');
  await page.getByRole('button', { name: 'Update cheque' }).click();
  await expect(page.locator('.cce-modal')).toHaveCount(0);
  expect(exchange.writes[1]).toMatchObject({ method: 'PUT', path: '/99', body: { cheque_amount: 125000, discount_percentage: 3 } });
  await page.reload();
  await page.getByRole('button', { name: 'Cheque management', exact: true }).click();
  await expect(row).toContainText('125,000');
  await expect(row).toContainText('3%');
});

test('cancel cheque edit and reopen new form clears old values', async ({ page, exchange }) => {
  const row = await createCheque(page);
  await row.getByTitle('Edit cheque').click();
  await page.locator('#cheque_number').fill('UNSAVED');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: 'Record cheque', exact: true }).first().click();
  await expect(page.locator('#cheque_number')).toHaveValue('');
  await expect(page.getByPlaceholder('Type customer name and select')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save cheque' })).toBeVisible();
  expect(exchange.writes).toHaveLength(1);
});

for (const accept of [false, true]) {
  test(`cheque delete ${accept ? 'API failure' : 'cancel'} preserves record`, async ({ page, exchange }) => {
    const row = await createCheque(page);
    exchange.fail = accept;
    page.once('dialog', d => accept ? d.accept() : d.dismiss());
    await row.getByTitle('Delete cheque').click();
    if (accept) await expect(page.getByText('Exchange service unavailable')).toBeVisible();
    await expect(row).toBeVisible();
    expect(exchange.cheques).toHaveLength(1);
    expect(exchange.writes).toHaveLength(1);
  });
}

test('customer details includes recorded cheque history', async ({ page }) => {
  await createCheque(page);
  await page.getByRole('button', { name: 'Customer management', exact: true }).click();
  await page.getByTitle('View details').click();
  const history = page.locator('.cce-modal .cce-table tbody tr');
  await expect(history).toContainText('CHQ-1001');
  await expect(history).toContainText('Sampath Bank');
  await expect(history).toContainText('100,000');
  await expect(history).toContainText('Pending');
});
