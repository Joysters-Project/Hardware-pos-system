/**
 * Fixes batch_inventory unique constraint:
 * Drops the global unique on batch_number (from original migration)
 * and ensures a composite unique on (product_id, batch_number).
 */
module.exports = async function ensureBatchInventorySchema(sequelize) {
  try {
    // Drop old global unique index on batch_number if it still exists
    const [globalIdx] = await sequelize.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'batch_inventory'
         AND COLUMN_NAME = 'batch_number'
         AND NON_UNIQUE = 0
         AND INDEX_NAME != 'uq_batch_product_batch_number'`
    );
    for (const row of globalIdx) {
      await sequelize.query(`ALTER TABLE batch_inventory DROP INDEX \`${row.INDEX_NAME}\``);
      console.log(`[Schema] batch_inventory: dropped old unique index "${row.INDEX_NAME}" on batch_number`);
    }

    // Add composite unique index if not already present
    const [compositeIdx] = await sequelize.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'batch_inventory'
         AND INDEX_NAME = 'uq_batch_product_batch_number'`
    );
    if (compositeIdx.length === 0) {
      await sequelize.query(
        `ALTER TABLE batch_inventory ADD UNIQUE INDEX uq_batch_product_batch_number (product_id, batch_number)`
      );
      console.log('[Schema] batch_inventory: composite unique index (product_id, batch_number) added.');
    }
  } catch (err) {
    console.warn('[Schema] ensureBatchInventorySchema warning:', err.message);
  }
};
