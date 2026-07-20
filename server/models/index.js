const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Support .env variables and fallback to server/config/config.json (Sequelize CLI style)
const env = process.env.NODE_ENV || 'development';
let dbConfig = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false,
};

try {
  const configFile = require(path.join(__dirname, '..', 'config', 'config.json'));
  if (configFile && configFile[env]) {
    const cfg = configFile[env];
    dbConfig = {
      database: process.env.DB_NAME || cfg.database,
      username: process.env.DB_USER || cfg.username,
      password: process.env.DB_PASS || cfg.password,
      host: process.env.DB_HOST || cfg.host,
      port: process.env.DB_PORT || cfg.port || 3306,
      dialect: cfg.dialect || 'mysql',
      logging: false,
    };
  }
} catch (e) {
  console.warn('⚠️ Could not read config/config.json, using environment variables only');
}

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    timezone: '+05:30',
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      timezone: '+05:30' 
    }
  }
);

// 2. Import all model files
const departments     = require('./departments');
const employees       = require('./employees');
const users           = require('./users');
const audit_log       = require('./audit_log');
const category        = require('./category');
const brands          = require('./brands');
const units           = require('./units');
const products        = require('./products');
const suppliers       = require('./suppliers');
const customers       = require('./customers');
const bills           = require('./bills');
const bill_items      = require('./bill_items');
const payments        = require('./payments');
const returns         = require('./returns');
const return_items    = require('./return_items');
const supplier_returns = require('./supplier_returns');
const alerts          = require('./alerts');
const purchase_orders = require('./purchase_orders');
const po_items        = require('./po_items');
const assets           = require('./assets');
const expenses         = require('./expenses');
const salary_payments  = require('./salary_payments');
const projects         = require('./projects');
const project_items    = require('./project_items');
const supplier_payments = require('./supplier_payments');
const procurement_notifications = require('./procurement_notifications');
const auto_reorder_suggestions = require('./auto_reorder_suggestions');
const email_logs = require('./email_logs');
const supplier_documents = require('./supplier_documents');
const product_units = require('./product_units');

// 3. Initialize the DB object
const db = {
  sequelize,
  Sequelize,
  departments:     departments(sequelize),
  employees:       employees(sequelize),
  users:           users(sequelize),
  audit_log:       audit_log(sequelize),
  category:        category(sequelize),
  brands:          brands(sequelize),
  units:           units(sequelize),
  products:        products(sequelize),
  suppliers:       suppliers(sequelize),
  customers:       customers(sequelize),
  bills:           bills(sequelize),
  bill_items:      bill_items(sequelize),
  payments:        payments(sequelize),
  returns:         returns(sequelize),
  return_items:    return_items(sequelize),
  supplier_returns: supplier_returns(sequelize),
  alerts:          alerts(sequelize),
  purchase_orders: purchase_orders(sequelize),
  po_items:        po_items(sequelize),
  assets:           assets(sequelize),
  expenses:         expenses(sequelize),
  salary_payments:  salary_payments(sequelize),
  projects:         projects(sequelize),
  project_items:    project_items(sequelize),
  supplier_payments: supplier_payments(sequelize),
  procurement_notifications: procurement_notifications(sequelize),
  auto_reorder_suggestions: auto_reorder_suggestions(sequelize),
  email_logs:       email_logs(sequelize),
  supplier_documents: supplier_documents(sequelize),
  product_units:    product_units(sequelize),
};

// 4. Define Relationships
// HR Module
db.departments.hasMany(db.employees,  { foreignKey: 'department_id' });
db.employees.belongsTo(db.departments, { foreignKey: 'department_id' });
db.employees.hasOne(db.users,   { foreignKey: 'employee_id' });
db.users.belongsTo(db.employees, { foreignKey: 'employee_id' });
db.users.hasMany(db.audit_log,  { foreignKey: 'user_id' });
db.audit_log.belongsTo(db.users, { foreignKey: 'user_id' });

// Product Module
db.category.hasMany(db.products,  { foreignKey: 'category_id' });
db.products.belongsTo(db.category, { foreignKey: 'category_id' });
db.brands.hasMany(db.products,  { foreignKey: 'brand_id' });
db.products.belongsTo(db.brands, { foreignKey: 'brand_id' });
db.units.hasMany(db.products,  { foreignKey: 'unit_id' });
db.products.belongsTo(db.units, { foreignKey: 'unit_id' });
db.products.hasMany(db.alerts,  { foreignKey: 'product_id' });
db.alerts.belongsTo(db.products, { foreignKey: 'product_id' });
db.products.hasMany(db.product_units, { foreignKey: 'product_id', as: 'alternative_units' });
db.product_units.belongsTo(db.products, { foreignKey: 'product_id' });
db.product_units.belongsTo(db.units, { foreignKey: 'unit_id', as: 'unit_details' });

// Sales Module
db.users.hasMany(db.bills, { foreignKey: 'user_id' });
db.bills.belongsTo(db.users, { foreignKey: 'user_id' });
db.customers.hasMany(db.bills, { foreignKey: 'customer_id' });
db.bills.belongsTo(db.customers, { foreignKey: 'customer_id' });
db.bills.hasMany(db.bill_items, { foreignKey: 'bill_id' });
db.bill_items.belongsTo(db.bills, { foreignKey: 'bill_id' });
db.units.hasMany(db.bill_items, { foreignKey: 'billed_unit_id' });
db.bill_items.belongsTo(db.units, { foreignKey: 'billed_unit_id', as: 'billed_unit' });
db.bill_items.addScope('forBill', {
  unique: 'bill_product_unique',
  fields: ['bill_id', 'product_id']
});
db.products.hasMany(db.bill_items, { foreignKey: 'product_id' });
db.bill_items.belongsTo(db.products, { foreignKey: 'product_id' });
db.bills.hasMany(db.payments, { foreignKey: 'bill_id' });
db.payments.belongsTo(db.bills, { foreignKey: 'bill_id' });
db.bills.hasMany(db.returns, { foreignKey: 'bill_id' });
db.returns.belongsTo(db.bills, { foreignKey: 'bill_id' });

db.returns.hasMany(db.return_items, { foreignKey: 'return_id', as: 'items' });
db.return_items.belongsTo(db.returns, { foreignKey: 'return_id' });

db.products.hasMany(db.return_items, { foreignKey: 'product_id' });
db.return_items.belongsTo(db.products, { foreignKey: 'product_id' });

db.returns.hasOne(db.supplier_returns, { foreignKey: 'return_id' });
db.supplier_returns.belongsTo(db.returns, { foreignKey: 'return_id' });
db.supplier_returns.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });
db.supplier_returns.belongsTo(db.products, { foreignKey: 'product_id' });

// Asset Module
db.departments.hasMany(db.assets,  { foreignKey: 'department_id' });
db.assets.belongsTo(db.departments, { foreignKey: 'department_id' });

// Salary Module
db.employees.hasMany(db.salary_payments, { foreignKey: 'employee_id' });
db.salary_payments.belongsTo(db.employees, { foreignKey: 'employee_id' });

// Expense Module
db.departments.hasMany(db.expenses, { foreignKey: 'department_id' });
db.expenses.belongsTo(db.departments, { foreignKey: 'department_id' });
db.assets.hasMany(db.expenses, { foreignKey: 'asset_id' });
db.expenses.belongsTo(db.assets, { foreignKey: 'asset_id' });

// Procurement Module
db.suppliers.hasMany(db.purchase_orders, { foreignKey: 'supplier_id' });
db.purchase_orders.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });
db.purchase_orders.hasMany(db.po_items, { foreignKey: 'po_id' });
db.po_items.belongsTo(db.purchase_orders, { foreignKey: 'po_id' });
db.products.hasMany(db.po_items, { foreignKey: 'product_id' });
db.po_items.belongsTo(db.products, { foreignKey: 'product_id' });

// Project Module
db.users.hasMany(db.projects, { foreignKey: 'created_by', as: 'createdProjects' });
db.projects.belongsTo(db.users, { foreignKey: 'created_by', as: 'creator' });
db.projects.hasMany(db.project_items, { foreignKey: 'project_id', as: 'items' });
db.project_items.belongsTo(db.projects, { foreignKey: 'project_id' });
db.project_items.belongsTo(db.products, { foreignKey: 'product_id', as: 'product' });
db.products.hasMany(db.project_items, { foreignKey: 'product_id' });
db.users.hasMany(db.project_items, { foreignKey: 'taken_by', as: 'takenItems' });
db.project_items.belongsTo(db.users, { foreignKey: 'taken_by', as: 'takenByUser' });

// Enhanced Procurement relations
db.suppliers.hasMany(db.supplier_payments, { foreignKey: 'supplier_id' });
db.supplier_payments.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });

db.purchase_orders.hasMany(db.supplier_payments, { foreignKey: 'po_id' });
db.supplier_payments.belongsTo(db.purchase_orders, { foreignKey: 'po_id' });

db.products.hasMany(db.auto_reorder_suggestions, { foreignKey: 'product_id' });
db.auto_reorder_suggestions.belongsTo(db.products, { foreignKey: 'product_id' });

db.suppliers.hasMany(db.auto_reorder_suggestions, { foreignKey: 'supplier_id' });
db.auto_reorder_suggestions.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });

db.purchase_orders.hasMany(db.auto_reorder_suggestions, { foreignKey: 'converted_po_id', as: 'convertedPO' });
db.auto_reorder_suggestions.belongsTo(db.purchase_orders, { foreignKey: 'converted_po_id', as: 'convertedPO' });

db.suppliers.hasMany(db.products, { foreignKey: 'preferred_supplier_id', as: 'preferredProducts' });
db.products.belongsTo(db.suppliers, { foreignKey: 'preferred_supplier_id', as: 'preferredSupplier' });

db.suppliers.hasMany(db.supplier_documents, { foreignKey: 'supplier_id' });
db.supplier_documents.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });

module.exports = db;
