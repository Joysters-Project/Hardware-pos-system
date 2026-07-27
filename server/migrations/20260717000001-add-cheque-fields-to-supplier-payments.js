'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('supplier_payments');

    const additions = [];

    if (!table.cheque_number) {
      additions.push(queryInterface.addColumn('supplier_payments', 'cheque_number', {
        type: Sequelize.STRING(100),
        allowNull: true
      }));
    }

    if (!table.bank_name) {
      additions.push(queryInterface.addColumn('supplier_payments', 'bank_name', {
        type: Sequelize.STRING(100),
        allowNull: true
      }));
    }

    if (!table.cheque_date) {
      additions.push(queryInterface.addColumn('supplier_payments', 'cheque_date', {
        type: Sequelize.DATEONLY,
        allowNull: true
      }));
    }

    if (!table.pending_cheque_date) {
      additions.push(queryInterface.addColumn('supplier_payments', 'pending_cheque_date', {
        type: Sequelize.DATEONLY,
        allowNull: true
      }));
    }

    if (!table.cheque_status) {
      additions.push(queryInterface.addColumn('supplier_payments', 'cheque_status', {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: null
      }));
    }

    await Promise.all(additions);
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('supplier_payments');

    if (table.cheque_number) {
      await queryInterface.removeColumn('supplier_payments', 'cheque_number');
    }
    if (table.bank_name) {
      await queryInterface.removeColumn('supplier_payments', 'bank_name');
    }
    if (table.cheque_date) {
      await queryInterface.removeColumn('supplier_payments', 'cheque_date');
    }
    if (table.pending_cheque_date) {
      await queryInterface.removeColumn('supplier_payments', 'pending_cheque_date');
    }
    if (table.cheque_status) {
      await queryInterface.removeColumn('supplier_payments', 'cheque_status');
    }
  }
};
