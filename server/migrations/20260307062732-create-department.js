'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Department', {
      department_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      department_name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      budget:          { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Department');
  }
};