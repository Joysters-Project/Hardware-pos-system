const department     = require('./department');
const employee       = require('./employee');
const user           = require('./user');
const auditLog       = require('./auditLog');
const category       = require('./category');
const brand          = require('./brand');
const unit           = require('./unit');
const products       = require('./products');
const suppliers      = require('./suppliers');
const customer       = require('./customer');
const bills          = require('./bills');
const bill_items     = require('./bill_items');
const payment        = require('./payment');
const returns        = require('./returns');
const alerts         = require('./alerts');
const purchase_order = require('./purchase_order');
const po_items       = require('./po_items');

module.exports = (sequelize) => {
  const models = {
    department:     department(sequelize),
    employee:       employee(sequelize),
    user:           user(sequelize),
    auditLog:       auditLog(sequelize),
    category:       category(sequelize),
    brand:          brand(sequelize),
    unit:           unit(sequelize),
    products:       products(sequelize),
    suppliers:      suppliers(sequelize),
    customer:       customer(sequelize),
    bills:          bills(sequelize),
    bill_items:     bill_items(sequelize),
    payment:        payment(sequelize),
    returns:        returns(sequelize),
    alerts:         alerts(sequelize),
    purchase_order: purchase_order(sequelize),
    po_items:       po_items(sequelize),
  };

  // ── HR Module ──────────────────────────────────────────────
  models.department.hasMany(models.employee,  { foreignKey: 'department_id' });
  models.employee.belongsTo(models.department, { foreignKey: 'department_id' });

  models.employee.hasOne(models.user,   { foreignKey: 'employee_id' });
  models.user.belongsTo(models.employee, { foreignKey: 'employee_id' });

  models.user.hasMany(models.auditLog,  { foreignKey: 'user_id' });
  models.auditLog.belongsTo(models.user, { foreignKey: 'user_id' });

  // ── Product Module ─────────────────────────────────────────
  models.category.hasMany(models.products,  { foreignKey: 'category_id' });
  models.products.belongsTo(models.category, { foreignKey: 'category_id' });

  models.brand.hasMany(models.products,  { foreignKey: 'brand_id' });
  models.products.belongsTo(models.brand, { foreignKey: 'brand_id' });

  models.unit.hasMany(models.products,  { foreignKey: 'unit_id' });
  models.products.belongsTo(models.unit, { foreignKey: 'unit_id' });

  models.products.hasMany(models.alerts,  { foreignKey: 'product_id' });
  models.alerts.belongsTo(models.products, { foreignKey: 'product_id' });

  // ── Sales Module ───────────────────────────────────────────
  models.user.hasMany(models.bills,     { foreignKey: 'user_id' });
  models.bills.belongsTo(models.user,   { foreignKey: 'user_id' });

  models.customer.hasMany(models.bills, { foreignKey: 'customer_id' });
  models.bills.belongsTo(models.customer, { foreignKey: 'customer_id' });

  models.bills.hasMany(models.bill_items,    { foreignKey: 'bill_id' });
  models.bill_items.belongsTo(models.bills,  { foreignKey: 'bill_id' });

  models.products.hasMany(models.bill_items,    { foreignKey: 'product_id' });
  models.bill_items.belongsTo(models.products,  { foreignKey: 'product_id' });

  models.bills.hasMany(models.payment,   { foreignKey: 'bill_id' });
  models.payment.belongsTo(models.bills, { foreignKey: 'bill_id' });

  models.bills.hasMany(models.returns,   { foreignKey: 'bill_id' });
  models.returns.belongsTo(models.bills, { foreignKey: 'bill_id' });

  models.products.hasMany(models.returns,   { foreignKey: 'product_id' });
  models.returns.belongsTo(models.products, { foreignKey: 'product_id' });

  // ── Procurement Module ─────────────────────────────────────
  models.suppliers.hasMany(models.purchase_order,    { foreignKey: 'supplier_id' });
  models.purchase_order.belongsTo(models.suppliers,  { foreignKey: 'supplier_id' });

  models.purchase_order.hasMany(models.po_items,    { foreignKey: 'po_id' });
  models.po_items.belongsTo(models.purchase_order,  { foreignKey: 'po_id' });

  models.products.hasMany(models.po_items,   { foreignKey: 'product_id' });
  models.po_items.belongsTo(models.products, { foreignKey: 'product_id' });

  return models;
};