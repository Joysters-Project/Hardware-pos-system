'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- purchase_orders ---
    const poDesc = await queryInterface.describeTable('purchase_orders');

    if (!poDesc['po_number']) {
      await queryInterface.addColumn('purchase_orders', 'po_number', {
        type: Sequelize.STRING(50), allowNull: true, unique: true
      });
    }
    if (!poDesc['created_by']) {
      await queryInterface.addColumn('purchase_orders', 'created_by', {
        type: Sequelize.INTEGER, allowNull: true
      });
    }
    if (!poDesc['actual_delivery_date']) {
      await queryInterface.addColumn('purchase_orders', 'actual_delivery_date', {
        type: Sequelize.DATEONLY, allowNull: true
      });
    }
    if (!poDesc['notes']) {
      await queryInterface.addColumn('purchase_orders', 'notes', {
        type: Sequelize.TEXT, allowNull: true
      });
    }

    // --- po_items: add unit_price if missing ---
    const poItemDesc = await queryInterface.describeTable('po_items');
    if (!poItemDesc['unit_price']) {
      await queryInterface.addColumn('po_items', 'unit_price', {
        type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0
      });
    }
    // Add auto-increment id if po_items has no standalone id column
    if (!poItemDesc['id']) {
      // Can't easily add auto-increment PK on MySQL without recreating; just add a non-pk id for reference
      await queryInterface.addColumn('po_items', 'id', {
        type: Sequelize.INTEGER, allowNull: true, autoIncrement: false
      });
    }
  },

  async down(queryInterface) {
    try { await queryInterface.removeColumn('purchase_orders', 'po_number'); } catch (_) {}
    try { await queryInterface.removeColumn('purchase_orders', 'created_by'); } catch (_) {}
    try { await queryInterface.removeColumn('purchase_orders', 'actual_delivery_date'); } catch (_) {}
    try { await queryInterface.removeColumn('purchase_orders', 'notes'); } catch (_) {}
    try { await queryInterface.removeColumn('po_items', 'unit_price'); } catch (_) {}
  }
};
