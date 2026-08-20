require('dotenv').config({ quiet: true });
const { Sequelize, DataTypes } = require('sequelize');
const cfg = require('../config/config.json').development;
const databaseUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;

const s = databaseUrl
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

const addIf = async (s, table, col, def) => {
  const [rows] = await s.query(`DESCRIBE \`${table}\``);
  if (!rows.find(r => r.Field === col)) {
    await s.getQueryInterface().addColumn(table, col, def);
    console.log('ADDED   ' + table + '.' + col);
  } else {
    console.log('EXISTS  ' + table + '.' + col);
  }
};

s.authenticate().then(async () => {
  await addIf(s, 'products',    'reorder_quantity', { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 });
  await addIf(s, 'departments', 'created_at',       { type: DataTypes.DATE,       allowNull: true,  defaultValue: DataTypes.NOW });
  await addIf(s, 'payments',    'payment_method',   { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'CASH' });
  await addIf(s, 'payments',    'collected_by',     { type: DataTypes.INTEGER,    allowNull: true });
  console.log('\nAll fixes applied!');
  s.close();
}).catch(e => { console.error('ERROR:', e.message); s.close(); });
