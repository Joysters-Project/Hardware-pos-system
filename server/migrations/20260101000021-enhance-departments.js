'use strict';

// NO-OP: All columns (description, status, created_at, updated_at, used_budget)
// are now included in 20260307062732-create-departments.js
// This file is kept to avoid breaking the SequelizeMeta migration history.
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add columns only if they don't exist (safe guard for existing databases)
    const tableDesc = await queryInterface.describeTable('departments').catch(() => null);
    if (!tableDesc) return; // table doesn't exist yet, skip

    const addIfMissing = async (column, definition) => {
      if (!tableDesc[column]) {
        await queryInterface.addColumn('departments', column, definition);
      }
    };

    await addIfMissing('description', { type: Sequelize.TEXT, allowNull: true });
    await addIfMissing('status', {
      type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active'
    });
    await addIfMissing('created_at', {
      type: Sequelize.DATE, allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await addIfMissing('updated_at', {
      type: Sequelize.DATE, allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    });
    await addIfMissing('used_budget', {
      type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0
    });
  },

  async down(queryInterface) {
    // No-op down — columns are owned by the base create migration
  }
};
