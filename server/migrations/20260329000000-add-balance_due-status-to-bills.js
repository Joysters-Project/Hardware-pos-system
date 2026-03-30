'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bills', 'balance_due', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
    });

    await queryInterface.addColumn('bills', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'PAID',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bills', 'status');
    await queryInterface.removeColumn('bills', 'balance_due');
  }
};
