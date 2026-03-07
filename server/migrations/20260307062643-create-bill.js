'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bills', {
      bill_id:      { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      bill_no:      { type: Sequelize.STRING(50),  allowNull: false, unique: true },
      bill_date:    { type: Sequelize.DATE,         allowNull: false, defaultValue: Sequelize.NOW },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      discount:     { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      subtotal:     { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      customer_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'Customer', key: 'customer_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Bills');
  }
};