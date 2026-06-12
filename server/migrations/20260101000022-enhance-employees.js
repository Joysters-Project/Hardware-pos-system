'use strict';

// NO-OP: All columns (nic, address, status, profile_photo, join_date, created_at, updated_at)
// are now included in 20260307062747-create-employees.js
// This file is kept to avoid breaking the SequelizeMeta migration history.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('employees').catch(() => null);
    if (!tableDesc) return;

    const addIfMissing = async (column, definition) => {
      if (!tableDesc[column]) {
        await queryInterface.addColumn('employees', column, definition);
      }
    };

    await addIfMissing('nic',   { type: Sequelize.STRING(20), allowNull: true, unique: true });
    await addIfMissing('address', { type: Sequelize.TEXT, allowNull: true });
    await addIfMissing('status', {
      type: Sequelize.ENUM('Active', 'Inactive', 'Resigned'), allowNull: false, defaultValue: 'Active'
    });
    await addIfMissing('profile_photo', { type: Sequelize.STRING(255), allowNull: true });
    await addIfMissing('join_date', { type: Sequelize.DATEONLY, allowNull: true });
    await addIfMissing('created_at', {
      type: Sequelize.DATE, allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await addIfMissing('updated_at', {
      type: Sequelize.DATE, allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    });
  },

  async down(queryInterface) {
    // No-op down — columns are owned by the base create migration
  }
};
