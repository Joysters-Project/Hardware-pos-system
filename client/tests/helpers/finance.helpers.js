import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  finance: async ({ page }, use) => {
    const employees = [
      { employee_id: 1, first_name: 'Amal', last_name: 'Perera', salary: 50000, salary_category: 'monthly', status: 'Active' },
      { employee_id: 2, first_name: 'Nimal', last_name: 'Silva', salary: 2500, salary_category: 'daily', status: 'Active' },
    ];
    const state = {
      expenses: Array.from({ length: 11 }, (_, i) => ({ expense_id: i + 1, expense_type: i % 2 ? 'Transport' : 'Utility Bills', amount: 1000, expense_date: '2026-09-09', description: `Expense ${i + 1}`, department_id: 1 })),
      salaries: Array.from({ length: 13 }, (_, i) => ({ salary_payment_id: i + 1, employee_id: 1, employee: employees[0], salary_category: 'monthly', basic_salary: 50000, bonus_amount: 1000, deduction_amount: 500, final_salary: 50500, payment_month: 9, payment_year: 2026, payment_date: '2026-09-09', payment_method: 'Bank Transfer', payment_status: i % 2 ? 'Paid' : 'Pending' })),
      writes: [], fail: '',
    };
    await page.clock.setFixedTime(new Date('2026-09-09T00:00:00+05:30'));
    await page.addInitScript(() => {
      for (const storage of [sessionStorage, localStorage]) {
        storage.setItem('token', 'finance-browser-fixture');
        storage.setItem('role', 'admin');
        storage.setItem('userName', 'Finance Test');
        storage.setItem('loginTime', String(Date.now()));
      }
    });
    await page.route('**/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const path = url.pathname.split('/api')[1];
      const method = req.method();
      if (state.fail && path === state.fail) return route.fulfill({ status: 500, json: { message: 'Test service unavailable' } });
      if (method !== 'GET') {
        const body = req.postDataJSON();
        state.writes.push({ path, method, body });
        const collection = path.startsWith('/expenses') ? 'expenses' : 'salaries';
        const key = collection === 'expenses' ? 'expense_id' : 'salary_payment_id';
        const id = Number(path.split('/')[2]);
        if (method === 'DELETE') state[collection] = state[collection].filter(row => row[key] !== id);
        else if (method === 'POST') state[collection].push({ ...body, [key]: 99, employee: employees.find(e => String(e.employee_id) === String(body.employee_id)), payment_status: 'Pending' });
        else state[collection] = state[collection].map(row => row[key] === id ? { ...row, ...body, ...(path.endsWith('/pay') ? { payment_status: 'Paid' } : {}) } : row);
        return route.fulfill({ json: { message: 'Saved' } });
      }
      let data = {};
      if (path === '/employees') data = employees;
      if (path === '/departments') data = [{ department_id: 1, department_name: 'Operations' }];
      if (path === '/assets') data = [{ asset_id: 1, asset_name: 'Truck', status: 'Active' }];
      if (path === '/expenses') data = state.expenses;
      if (path === '/expenses/summary') data = { total: 11000, by_type: [] };
      if (path === '/salary/stats/dashboard') data = { pending: 7, paid: 6, upcoming: 2 };
      if (path.endsWith('/summary') && path.startsWith('/salary/')) data = { current_salary: 50000, total_paid_this_year: 303000 };
      if (path === '/salary') data = state.salaries.filter(row => [...url.searchParams].every(([key, value]) => key === 'search' ? `${row.employee.first_name} ${row.employee.last_name}`.toLowerCase().includes(value.toLowerCase()) : String(row[key === 'status' ? 'payment_status' : key]) === value));
      return route.fulfill({ json: data });
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await use(state);
    expect(errors).toEqual([]);
  },
});
export { expect };
