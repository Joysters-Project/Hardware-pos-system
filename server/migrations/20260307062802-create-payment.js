'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payment', {
      payment_id:     { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      bill_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Bills', key: 'bill_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      payment_date:   { type: Sequelize.DATE,         allowNull: false, defaultValue: Sequelize.NOW },
      amount_paid:    { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_status: { type: Sequelize.STRING(50),    allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Payment');
  }
};