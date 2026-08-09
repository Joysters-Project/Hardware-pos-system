const db = require('../models');

async function ensureMultiUnitSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();

    // ── 0. Ensure product_units table exists ────────────────────────────────
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_units (
        product_unit_id INT NOT NULL AUTO_INCREMENT,
        product_id      INT NOT NULL,
        unit_id         INT NOT NULL,
        conversion_factor DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
        unit_price      DECIMAL(10,2) DEFAULT NULL,
        cost_price      DECIMAL(10,2) DEFAULT NULL,
        barcode         VARCHAR(100) DEFAULT NULL,
        PRIMARY KEY (product_unit_id),
        KEY idx_pu_product (product_id),
        KEY idx_pu_unit    (unit_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ product_units table ready.');

    // Disable foreign key checks temporarily for migrations
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    const billItemsTable = await queryInterface.describeTable('bill_items');
    const productsTable  = await queryInterface.describeTable('products');

    // Add barcode to products if missing
    if (!productsTable.barcode) {
      console.log('Adding products.barcode');
      await queryInterface.addColumn('products', 'barcode', {
        type: db.Sequelize.STRING(100),
        allowNull: true,
      });
    }

    // Add billed_unit_id if missing
    if (!billItemsTable.billed_unit_id) {
      console.log('Adding bill_items.billed_unit_id');
      await queryInterface.addColumn('bill_items', 'billed_unit_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'units', key: 'unit_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // Add billed_quantity if missing
    if (!billItemsTable.billed_quantity) {
      console.log('Adding bill_items.billed_quantity');
      await queryInterface.addColumn('bill_items', 'billed_quantity', {
        type: db.Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    // Change quantity in bill_items to DECIMAL(10, 2) if it is INTEGER
    if (billItemsTable.quantity && billItemsTable.quantity.type.includes('INT')) {
      console.log('Altering bill_items.quantity to DECIMAL(10,2)');
      await db.sequelize.query('ALTER TABLE bill_items MODIFY COLUMN quantity DECIMAL(10, 2) NOT NULL;');
    }

    // Change stock_quantity in products to DECIMAL(10, 2) if it is INTEGER
    if (productsTable.stock_quantity && productsTable.stock_quantity.type.includes('INT')) {
      console.log('Altering products.stock_quantity to DECIMAL(10,2)');
      await db.sequelize.query('ALTER TABLE products MODIFY COLUMN stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00;');
    }

    // Change min_stock_quantity in products to DECIMAL(10, 2) if it is INTEGER
    if (productsTable.min_stock_quantity && productsTable.min_stock_quantity.type.includes('INT')) {
      console.log('Altering products.min_stock_quantity to DECIMAL(10,2)');
      await db.sequelize.query('ALTER TABLE products MODIFY COLUMN min_stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00;');
    }

    // Change reorder_level in products to DECIMAL(10, 2) if it is INTEGER
    if (productsTable.reorder_level && productsTable.reorder_level.type.includes('INT')) {
      console.log('Altering products.reorder_level to DECIMAL(10,2)');
      await db.sequelize.query('ALTER TABLE products MODIFY COLUMN reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0.00;');
    }

    // Re-enable foreign key checks
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ Multi-unit schema verified/updated for inventory and sales.');

  } catch (error) {
    try { await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch (e) {}
    console.error('⚠️ Multi-unit schema verification failed:', error.message);
  }
}

module.exports = ensureMultiUnitSchema;
