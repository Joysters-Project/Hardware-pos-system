require('dotenv').config({ quiet: true });
const { Sequelize, DataTypes } = require('sequelize');
const cfg = require('../config/config.json').development;
const databaseUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, { dialect: 'mysql', logging: false })
  : new Sequelize(
    process.env.MYSQLDATABASE || cfg.database,
    process.env.MYSQLUSER || cfg.username,
    process.env.MYSQLPASSWORD || cfg.password,
    {
      host: process.env.MYSQLHOST || cfg.host,
      port: process.env.MYSQLPORT || cfg.port || 3306,
      dialect: 'mysql',
      logging: false
    }
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

(async () => {
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

    // products
    await addIf(qi, 'products', 'avg_daily_sales',       { type: DataTypes.DECIMAL(10,4), allowNull: true, defaultValue: 0 });
    await addIf(qi, 'products', 'preferred_supplier_id', { type: DataTypes.INTEGER,       allowNull: true });

    console.log('\nAll procurement schema fixes applied!');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await sequelize.close();
  }
})();
