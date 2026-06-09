'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('departments', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('departments', 'status', {
      type: Sequelize.ENUM('Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Active'
    });
    
    await queryInterface.addColumn('departments', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('departments', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('departments', 'used_budget', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('departments', 'description');
    await queryInterface.removeColumn('departments', 'status');
    await queryInterface.removeColumn('departments', 'created_at');
    await queryInterface.removeColumn('departments', 'updated_at');
    await queryInterface.removeColumn('departments', 'used_budget');
  }
};
