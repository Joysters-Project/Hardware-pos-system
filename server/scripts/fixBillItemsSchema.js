require('dotenv').config();
const db = require('../models');

async function fixSchema() {
  const q = (sql) => db.sequelize.query(sql);

  // Find the FK constraint names on bill_items
  const [fks] = await q(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bill_items'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  console.log('Foreign keys found:', fks.map(f => f.CONSTRAINT_NAME));

  // Drop all FKs first
  for (const fk of fks) {
    try { await q(`ALTER TABLE bill_items DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``); console.log('FK dropped:', fk.CONSTRAINT_NAME); }
    catch(e) { console.log('FK drop note:', e.message); }
  }

  // Now drop composite PK
  try { await q('ALTER TABLE bill_items DROP PRIMARY KEY'); console.log('PK dropped'); }
  catch(e) { console.log('PK drop note:', e.message); }

  // Add item_id as new PK
  try { await q('ALTER TABLE bill_items ADD COLUMN item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST'); console.log('item_id added'); }
  catch(e) { console.log('item_id note:', e.message); }

  // Restore bill_id FK
  try {
    await q('ALTER TABLE bill_items ADD CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON UPDATE CASCADE ON DELETE CASCADE');
    console.log('bill_id FK restored');
  } catch(e) { console.log('FK restore note:', e.message); }

  // Restore product_id FK
  try {
    await q('ALTER TABLE bill_items ADD CONSTRAINT fk_bill_items_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE ON DELETE CASCADE');
    console.log('product_id FK restored');
  } catch(e) { console.log('FK restore note:', e.message); }

  // Add missing columns if not present
  try { await q('ALTER TABLE bill_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00'); console.log('price_per_unit added'); }
  catch(e) { console.log('price_per_unit note:', e.message); }

  try { await q('ALTER TABLE bill_items ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0.00'); console.log('discount added'); }
  catch(e) { console.log('discount note:', e.message); }

  const [cols] = await q('DESCRIBE bill_items');
  console.log('Final bill_items columns:', cols.map(c => `${c.Field}(${c.Key})`).join(', '));
  process.exit(0);
}

fixSchema().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
