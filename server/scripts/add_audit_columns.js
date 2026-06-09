require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../models');

async function main() {
  const q = (sql) => db.sequelize.query(sql);
  await db.sequelize.authenticate();

  try { await q("ALTER TABLE audit_log ADD COLUMN role VARCHAR(50) NULL AFTER details"); console.log('role column added'); }
  catch (e) { console.log('role:', e.message.includes('Duplicate') ? 'already exists' : e.message); }

  try { await q("ALTER TABLE audit_log ADD COLUMN ip_address VARCHAR(45) NULL AFTER role"); console.log('ip_address column added'); }
  catch (e) { console.log('ip_address:', e.message.includes('Duplicate') ? 'already exists' : e.message); }

  const [cols] = await q('DESCRIBE audit_log');
  console.log('Final columns:', cols.map(c => c.Field).join(', '));
  await db.sequelize.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
