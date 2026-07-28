'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('salary_payments', 'payment_frequency', {
      type: Sequelize.ENUM('daily', 'weekly', 'work_based', 'monthly'),
      allowNull: false,
      defaultValue: 'monthly'
    });
    await queryInterface.addColumn('salary_payments', 'pay_period_start_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('salary_payments', 'pay_period_end_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('salary_payments', 'due_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('salary_payments', 'alert_status', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'none'
    });
    await queryInterface.addColumn('salary_payments', 'alert_message', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('salary_payments', 'alert_message');
    await queryInterface.removeColumn('salary_payments', 'alert_status');
    await queryInterface.removeColumn('salary_payments', 'due_date');
    await queryInterface.removeColumn('salary_payments', 'pay_period_end_date');
    await queryInterface.removeColumn('salary_payments', 'pay_period_start_date');
    await queryInterface.removeColumn('salary_payments', 'payment_frequency');
  }
};
