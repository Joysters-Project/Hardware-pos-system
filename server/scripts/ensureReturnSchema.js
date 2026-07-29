const db = require('../models');

async function ensureReturnSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();

    // Ensure models tables exist via sync (force: false)
    await db.inventory_statuses.sync();
    await db.product_warranties.sync();
    await db.supplier_services.sync();
    await db.returns.sync();
    await db.return_items.sync();

    // Verify / alter `returns` table columns
    const returnsTable = await queryInterface.describeTable('returns');
    if (!returnsTable.customer_id) {
      await queryInterface.addColumn('returns', 'customer_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true
      });
    }
    if (!returnsTable.reason) {
      await queryInterface.addColumn('returns', 'reason', {
        type: db.Sequelize.TEXT,
        allowNull: true
      });
    }

    // Verify / alter `return_items` table columns
    const returnItemsTable = await queryInterface.describeTable('return_items');
    if (!returnItemsTable.quantity) {
      await queryInterface.addColumn('return_items', 'quantity', {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }
    if (!returnItemsTable.condition) {
      await queryInterface.addColumn('return_items', 'condition', {
        type: db.Sequelize.ENUM('DAMAGED', 'GOOD', 'DEFECTIVE'),
        allowNull: false,
        defaultValue: 'DEFECTIVE'
      });
    }
    if (!returnItemsTable.action) {
      await queryInterface.addColumn('return_items', 'action', {
        type: db.Sequelize.ENUM('REFUND', 'REPAIR', 'EXCHANGE', 'SCRAP', 'SUPPLIER_RETURN'),
        allowNull: false,
        defaultValue: 'REFUND'
      });
    }

    // Seed inventory_statuses for products that don't have one yet
    const allProducts = await db.products.findAll({ attributes: ['product_id', 'stock_quantity'] });
    for (const p of allProducts) {
      const existing = await db.inventory_statuses.findOne({ where: { product_id: p.product_id } });
      if (!existing) {
        await db.inventory_statuses.create({
          product_id: p.product_id,
          available_qty: p.stock_quantity || 0,
          repair_qty: 0,
          damaged_qty: 0
        });
      }
    }

    console.log('✅ Return Management & Warranty schema verified/updated successfully.');
  } catch (error) {
    console.error('⚠️ Return schema verification failed:', error.message);
  }
}

module.exports = ensureReturnSchema;
