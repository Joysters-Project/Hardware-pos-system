'use strict';

// NO-OP: failed_attempts, is_locked, lock_time, reset_token, reset_token_expiry
// are all included in 20260307062525-create-users.js
// This file is kept to avoid breaking the SequelizeMeta migration history.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('users').catch(() => null);
    if (!tableDesc) return;

    const addIfMissing = async (column, definition) => {
      if (!tableDesc[column]) {
        await queryInterface.addColumn('users', column, definition);
      }
    };

    await addIfMissing('failed_attempts', {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0
    });
    await addIfMissing('is_locked', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
    });
    await addIfMissing('lock_time', {
      type: Sequelize.DATE, allowNull: true
    });
    await addIfMissing('reset_token', {
      type: Sequelize.STRING(255), allowNull: true, defaultValue: null
    });
    await addIfMissing('reset_token_expiry', {
      type: Sequelize.DATE, allowNull: true, defaultValue: null
    });
  },

  async down(queryInterface) {
    // No-op down — columns are owned by the base create migration
  }
};
