require('dotenv').config();
const db = require('./models');

// Map of table -> columns that controllers/models reference but may be missing
const REQUIRED = {
  departments:      ['status', 'description', 'used_budget'],
  employees:        ['nic', 'address', 'status'],
  products:         ['expiry_date', 'status', 'avg_daily_sales', 'preferred_supplier_id'],
  users:            ['employee_id'],
  alerts:           ['purchase_order_id'],
  purchase_orders:  ['actual_delivery_date', 'cancel_reason'],
  suppliers:        ['performance_score', 'performance_tier', 'supplier_code', 'contact_person', 'phone', 'email'],
  supplier_payments:['clearing_date', 'cheque_status', 'pending_cheque_date'],
  expenses:         ['expense_date', 'department_id', 'asset_id'],
  assets:           ['status', 'condition_type', 'cost', 'purchase_date'],
  salary_payments:  ['salary_category', 'payment_status', 'payment_method'],
};

const ALTER = {
  'departments.status':             "ALTER TABLE departments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'",
  'departments.description':        "ALTER TABLE departments ADD COLUMN description TEXT NULL",
  'departments.used_budget':        "ALTER TABLE departments ADD COLUMN used_budget DECIMAL(15,2) NOT NULL DEFAULT 0",
  'employees.nic':                  "ALTER TABLE employees ADD COLUMN nic VARCHAR(20) NULL",
  'employees.address':              "ALTER TABLE employees ADD COLUMN address TEXT NULL",
  'employees.status':               "ALTER TABLE employees ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'",
  'products.expiry_date':           "ALTER TABLE products ADD COLUMN expiry_date DATE NULL",
  'products.status':                "ALTER TABLE products ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'",
  'products.avg_daily_sales':       "ALTER TABLE products ADD COLUMN avg_daily_sales DECIMAL(10,4) NOT NULL DEFAULT 0",
  'products.preferred_supplier_id': "ALTER TABLE products ADD COLUMN preferred_supplier_id INT NULL",
  'alerts.purchase_order_id':       "ALTER TABLE alerts ADD COLUMN purchase_order_id INT NULL",
  'purchase_orders.actual_delivery_date': "ALTER TABLE purchase_orders ADD COLUMN actual_delivery_date DATE NULL",
  'purchase_orders.cancel_reason':  "ALTER TABLE purchase_orders ADD COLUMN cancel_reason TEXT NULL",
};

(async () => {
  const missing = [];
  for (const [table, cols] of Object.entries(REQUIRED)) {
    for (const col of cols) {
      try {
        await db.sequelize.query(`SELECT \`${col}\` FROM \`${table}\` LIMIT 1`);
      } catch (e) {
        missing.push(`${table}.${col}`);
      }
    }
  }

  if (missing.length === 0) {
    console.log('All columns present — schema is up to date.');
    process.exit(0);
  }

  console.log('Missing columns:', missing.join(', '));

  for (const key of missing) {
    const sql = ALTER[key];
    if (!sql) { console.log(`No ALTER defined for ${key} — skipping`); continue; }
    try {
      await db.sequelize.query(sql);
      console.log(`ADDED: ${key}`);
    } catch (e) {
      console.error(`FAIL:  ${key} — ${e.message}`);
    }
  }

  process.exit(0);
})();
