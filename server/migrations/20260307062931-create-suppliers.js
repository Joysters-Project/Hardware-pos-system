'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suppliers', {
      supplier_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      supplier_name: { type: Sequelize.STRING(200), allowNull: false },
      contact:       { type: Sequelize.STRING(100), allowNull: false },
      address:       { type: Sequelize.TEXT,        allowNull: true },
      payment_terms: { type: Sequelize.STRING(100), allowNull: true },
      status:        { type: Sequelize.STRING(20),  allowNull: false, defaultValue: 'Active' }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('suppliers');
  }
};