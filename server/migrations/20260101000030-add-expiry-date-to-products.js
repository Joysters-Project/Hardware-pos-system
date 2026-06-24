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
  },
  down: async (queryInterface) => {
    const tableDesc = await queryInterface.describeTable('products');
    if (tableDesc.expiry_date) {
      await queryInterface.removeColumn('products', 'expiry_date');
    }
  },
};
