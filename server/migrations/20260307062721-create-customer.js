'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Customer', {
      customer_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      customer_name: { type: Sequelize.STRING(200), allowNull: false },
      phone_no:      { type: Sequelize.STRING(20),  allowNull: true },
      address:       { type: Sequelize.TEXT,        allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Customer');
  }
};