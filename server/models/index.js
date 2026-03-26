const { Sequelize } = require('sequelize');
require('dotenv').config();

// 1. Initialize Sequelize Connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
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
const alerts          = require('./alerts');
const purchase_orders = require('./purchase_orders');
const po_items        = require('./po_items');

// 3. Initialize the DB object
const db = {
  sequelize, // CRITICAL: This allows index.js to call .sync()
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
  alerts:          alerts(sequelize),
  purchase_orders: purchase_orders(sequelize),
  po_items:        po_items(sequelize),
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

// Sales Module
db.users.hasMany(db.bills, { foreignKey: 'user_id' });
db.bills.belongsTo(db.users, { foreignKey: 'user_id' });
db.customers.hasMany(db.bills, { foreignKey: 'customer_id' });
db.bills.belongsTo(db.customers, { foreignKey: 'customer_id' });
db.bills.hasMany(db.bill_items, { foreignKey: 'bill_id' });
db.bill_items.belongsTo(db.bills, { foreignKey: 'bill_id' });
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
db.products.hasMany(db.returns, { foreignKey: 'product_id' });
db.returns.belongsTo(db.products, { foreignKey: 'product_id' });

// Procurement Module
db.suppliers.hasMany(db.purchase_orders, { foreignKey: 'supplier_id' });
db.purchase_orders.belongsTo(db.suppliers, { foreignKey: 'supplier_id' });
db.purchase_orders.hasMany(db.po_items, { foreignKey: 'po_id' });
db.po_items.belongsTo(db.purchase_orders, { foreignKey: 'po_id' });
db.products.hasMany(db.po_items, { foreignKey: 'product_id' });
db.po_items.belongsTo(db.products, { foreignKey: 'product_id' });

module.exports = db;
