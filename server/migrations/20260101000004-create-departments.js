'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('departments', {
      department_id: {
        type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false
      },
      department_name: {
        type: Sequelize.STRING(100), allowNull: false, unique: true
      },
      budget: {
        type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0
      },
      used_budget: {
        type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0
      },
      description: {
        type: Sequelize.TEXT, allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active'
      },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('departments');
  }
};
