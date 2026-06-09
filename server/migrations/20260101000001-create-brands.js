'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('brands', {
      brand_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      brand_name: { type: Sequelize.STRING(100), allowNull: false, unique: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('brands');
  }
};