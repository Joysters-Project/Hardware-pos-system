// 1. Import all model files (Ensure these .js files exist in the folder!)
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

module.exports = (sequelize) => {
  const models = {
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

  // ── HR Module ──────────────────────────────────────────────
  models.departments.hasMany(models.employees,  { foreignKey: 'department_id' });
  models.employees.belongsTo(models.departments, { foreignKey: 'department_id' });
  models.employees.hasOne(models.users,   { foreignKey: 'employee_id' });
  models.users.belongsTo(models.employees, { foreignKey: 'employee_id' });
  models.users.hasMany(models.audit_log,  { foreignKey: 'user_id' });
  models.audit_log.belongsTo(models.users, { foreignKey: 'user_id' });

  // ── Product Module ─────────────────────────────────────────
  models.category.hasMany(models.products,  { foreignKey: 'category_id' });
  models.products.belongsTo(models.category, { foreignKey: 'category_id' });
  models.brands.hasMany(models.products,  { foreignKey: 'brand_id' });
  models.products.belongsTo(models.brands, { foreignKey: 'brand_id' });
  models.units.hasMany(models.products,  { foreignKey: 'unit_id' });
  models.products.belongsTo(models.units, { foreignKey: 'unit_id' });
  models.products.hasMany(models.alerts,  { foreignKey: 'product_id' });
  models.alerts.belongsTo(models.products, { foreignKey: 'product_id' });

  // ── Sales Module ───────────────────────────────────────────
  models.users.hasMany(models.bills,     { foreignKey: 'user_id' });
  models.bills.belongsTo(models.users,   { foreignKey: 'user_id' });
  models.customers.hasMany(models.bills, { foreignKey: 'customer_id' });
  models.bills.belongsTo(models.customers, { foreignKey: 'customer_id' });
  models.bills.hasMany(models.bill_items,    { foreignKey: 'bill_id' });
  models.bill_items.belongsTo(models.bills,  { foreignKey: 'bill_id' });
  models.products.hasMany(models.bill_items,    { foreignKey: 'product_id' });
  models.bill_items.belongsTo(models.products,  { foreignKey: 'product_id' });
  models.bills.hasMany(models.payments,   { foreignKey: 'bill_id' });
  models.payments.belongsTo(models.bills, { foreignKey: 'bill_id' });
  models.bills.hasMany(models.returns,   { foreignKey: 'bill_id' });
  models.returns.belongsTo(models.bills, { foreignKey: 'bill_id' });
  models.products.hasMany(models.returns,   { foreignKey: 'product_id' });
  models.returns.belongsTo(models.products, { foreignKey: 'product_id' });

  // ── Procurement Module ─────────────────────────────────────
  models.suppliers.hasMany(models.purchase_orders,    { foreignKey: 'supplier_id' });
  models.purchase_orders.belongsTo(models.suppliers,  { foreignKey: 'supplier_id' });
  models.purchase_orders.hasMany(models.po_items,    { foreignKey: 'po_id' });
  models.po_items.belongsTo(models.purchase_orders,  { foreignKey: 'po_id' });
  models.products.hasMany(models.po_items,   { foreignKey: 'product_id' });
  models.po_items.belongsTo(models.products, { foreignKey: 'product_id' });

  return models;
};
