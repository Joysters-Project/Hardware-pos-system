'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('projects');
    if (!table.final_cost) {
      await queryInterface.addColumn('projects', 'final_cost', {
        type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: null,
      });
    }
    if (!table.amount_paid) {
      await queryInterface.addColumn('projects', 'amount_paid', {
        type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0,
      });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('projects', 'final_cost');
    await queryInterface.removeColumn('projects', 'amount_paid');
  }
};
