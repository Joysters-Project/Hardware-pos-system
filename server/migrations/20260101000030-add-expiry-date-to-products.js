'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('products');
    if (!tableDesc.expiry_date) {
      await queryInterface.addColumn('products', 'expiry_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
      });
    }
    const tableDesc = await queryInterface.describeTable('products').catch(() => null);
    if (!tableDesc) return;

    if (!tableDesc['expiry_date']) {
      await queryInterface.addColumn('products', 'expiry_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added expiry_date column to products');
    } else {
      console.log('ℹ️  expiry_date already exists — skipping');
    }
  },
  down: async (queryInterface) => {
    const tableDesc = await queryInterface.describeTable('products');
    if (tableDesc.expiry_date) {
      await queryInterface.removeColumn('products', 'expiry_date');
    }
    const tableDesc = await queryInterface.describeTable('products').catch(() => null);
    if (!tableDesc) return;

    if (tableDesc['expiry_date']) {
      await queryInterface.removeColumn('products', 'expiry_date');
    }
  },
};
