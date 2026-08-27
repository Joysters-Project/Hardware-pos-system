'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('supplier_payments');
    if (!table.clearing_date) {
      await queryInterface.addColumn('supplier_payments', 'clearing_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('supplier_payments');
    if (table.clearing_date) {
      await queryInterface.removeColumn('supplier_payments', 'clearing_date');
    }
  },
};
