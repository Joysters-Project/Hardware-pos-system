'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('bills', 'balance_due', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column balance_due already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.addColumn('bills', 'status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'PAID',
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column status already exists, skipping...');
      } else {
        throw err;
      }
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('bills', 'status');
    } catch (err) {
      console.log('Column status does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('bills', 'balance_due');
    } catch (err) {
      console.log('Column balance_due does not exist, skipping...');
    }
  }
};
