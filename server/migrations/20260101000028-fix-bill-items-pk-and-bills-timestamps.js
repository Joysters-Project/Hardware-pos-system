'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    try {
      // ── bill_items: replace composite PK with auto-increment item_id ──────────
      // Check if item_id already exists to make this idempotent
      const billItemsCols = await queryInterface.describeTable('bill_items');

      if (!billItemsCols.item_id) {
        // Drop the composite primary key first
        try {
          await queryInterface.removeConstraint('bill_items', 'PRIMARY');
        } catch (e) {
          // MySQL syntax — drop and re-add via raw SQL
          await queryInterface.sequelize.query(
            'ALTER TABLE bill_items DROP PRIMARY KEY'
          );
        }

        // Add item_id as auto-increment PK
        await queryInterface.addColumn('bill_items', 'item_id', {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        }, { first: true });
      }

      // ── bills: remove created_at / updated_at if they were added by sync ─────
      const billsCols = await queryInterface.describeTable('bills');
      if (billsCols.created_at) {
        await queryInterface.removeColumn('bills', 'created_at');
      }
      if (billsCols.updated_at) {
        await queryInterface.removeColumn('bills', 'updated_at');
      }
    } finally {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    try {
      // Reverse: remove item_id and restore composite PK
      const billItemsCols = await queryInterface.describeTable('bill_items');
      if (billItemsCols.item_id) {
        await queryInterface.sequelize.query(
          'ALTER TABLE bill_items DROP PRIMARY KEY, DROP COLUMN item_id'
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE bill_items ADD PRIMARY KEY (bill_id, product_id)'
        );
      }
    } finally {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    }
  }
};
