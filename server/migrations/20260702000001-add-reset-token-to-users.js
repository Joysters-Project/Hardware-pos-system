'use strict';

// Safely adds reset_token and reset_token_expiry to the live users table.
// Uses describeTable check so it is a no-op if columns already exist.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('users').catch(() => null);
    if (!tableDesc) return;

    if (!tableDesc['reset_token']) {
      await queryInterface.addColumn('users', 'reset_token', {
        type: Sequelize.STRING(255), allowNull: true, defaultValue: null
      });
      console.log('✅ Added reset_token column to users');
    } else {
      console.log('ℹ️  reset_token already exists — skipping');
    }

    if (!tableDesc['reset_token_expiry']) {
      await queryInterface.addColumn('users', 'reset_token_expiry', {
        type: Sequelize.DATE, allowNull: true, defaultValue: null
      });
      console.log('✅ Added reset_token_expiry column to users');
    } else {
      console.log('ℹ️  reset_token_expiry already exists — skipping');
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('users').catch(() => null);
    if (!tableDesc) return;

    if (tableDesc['reset_token_expiry']) {
      await queryInterface.removeColumn('users', 'reset_token_expiry');
    }
    if (tableDesc['reset_token']) {
      await queryInterface.removeColumn('users', 'reset_token');
    }
  }
};
