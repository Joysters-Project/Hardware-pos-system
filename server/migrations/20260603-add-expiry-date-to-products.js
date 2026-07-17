'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('products').catch(() => null);
    if (!tableDesc) return;

    if (!tableDesc['expiry_date']) {
      await queryInterface.addColumn('products', 'expiry_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      console.log('✅ Added expiry_date column to products');
    } else {
      console.log('ℹ️  expiry_date already exists — skipping');
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('products').catch(() => null);
    if (!tableDesc) return;

    if (tableDesc['expiry_date']) {
      await queryInterface.removeColumn('products', 'expiry_date');
    }
  },
};
