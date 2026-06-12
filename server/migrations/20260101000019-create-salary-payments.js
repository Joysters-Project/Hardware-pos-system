'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('salary_payments', {
      salary_payment_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'employee_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      basic_salary:     { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      bonus_amount:     { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      deduction_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      final_salary:     { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_month:    { type: Sequelize.INTEGER, allowNull: false },
      payment_year:     { type: Sequelize.INTEGER, allowNull: false },
      payment_date:     { type: Sequelize.DATEONLY, allowNull: true },
      payment_status:   { type: Sequelize.ENUM('Pending', 'Paid'), allowNull: false, defaultValue: 'Pending' },
      payment_method:   { type: Sequelize.ENUM('Cash', 'Bank Transfer', 'Cheque'), allowNull: true },
      remarks:          { type: Sequelize.TEXT, allowNull: true },
      payslip_pdf_path: { type: Sequelize.STRING(255), allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('salary_payments');
  }
};
