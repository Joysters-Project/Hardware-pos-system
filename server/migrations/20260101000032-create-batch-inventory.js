'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('batch_inventory', {
      batch_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      batch_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'product_id' }, onDelete: 'CASCADE' },
      purchase_order_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'purchase_orders', key: 'po_id' }, onDelete: 'SET NULL' },
      supplier_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'suppliers', key: 'supplier_id' }, onDelete: 'SET NULL' },
      purchase_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      received_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      remaining_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      received_date: { type: Sequelize.DATEONLY, allowNull: false },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('Active', 'Low Stock', 'Expired', 'Disposed'), allowNull: false, defaultValue: 'Active' },
      disposed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('batch_inventory');
  },
};
