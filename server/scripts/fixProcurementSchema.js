require('dotenv').config({ quiet: true });
const { Sequelize, DataTypes } = require('sequelize');
const cfg = require('../config/config.json').development;

const sequelize = new Sequelize(
  process.env.DB_NAME || cfg.database,
  process.env.DB_USER || cfg.username,
  process.env.DB_PASS || cfg.password,
  { host: process.env.DB_HOST || cfg.host, dialect: 'mysql', logging: false }
);

async function addIf(qi, table, col, def) {
  const [rows] = await sequelize.query(`DESCRIBE ${table}`);
  const exists = rows.some(r => r.Field === col);
  if (!exists) {
    await qi.addColumn(table, col, def);
    console.log(`ADDED   ${table}.${col}`);
  } else {
    console.log(`EXISTS  ${table}.${col}`);
  }
}

async function fixProcurementSchema() {
  try {
    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();

    // suppliers
    await addIf(qi, 'suppliers', 'performance_score',     { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0 });
    await addIf(qi, 'suppliers', 'performance_tier',      { type: DataTypes.STRING(50),    allowNull: false, defaultValue: 'Bronze' });
    await addIf(qi, 'suppliers', 'on_time_delivery_pct',  { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0 });
    await addIf(qi, 'suppliers', 'avg_delay_days',        { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0 });
    await addIf(qi, 'suppliers', 'order_success_rate',    { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0 });
    await addIf(qi, 'suppliers', 'total_purchase_volume', { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0 });

    // purchase_orders
    await addIf(qi, 'purchase_orders', 'po_number',            { type: DataTypes.STRING(50), allowNull: true });
    await addIf(qi, 'purchase_orders', 'created_by',           { type: DataTypes.INTEGER,    allowNull: true });
    await addIf(qi, 'purchase_orders', 'actual_delivery_date', { type: DataTypes.DATEONLY,   allowNull: true });
    await addIf(qi, 'purchase_orders', 'notes',                { type: DataTypes.TEXT,       allowNull: true });
    await addIf(qi, 'po_items', 'unit_price',                  { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 });
    await addIf(qi, 'po_items', 'comment',                     { type: DataTypes.TEXT, allowNull: true });

    // products
    await addIf(qi, 'products', 'avg_daily_sales',       { type: DataTypes.DECIMAL(10,4), allowNull: true, defaultValue: 0 });
    await addIf(qi, 'products', 'preferred_supplier_id', { type: DataTypes.INTEGER,       allowNull: true });

    console.log('\nAll procurement schema fixes applied!');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await sequelize.close();
  }
}

module.exports = fixProcurementSchema;

if (require.main === module) fixProcurementSchema();
