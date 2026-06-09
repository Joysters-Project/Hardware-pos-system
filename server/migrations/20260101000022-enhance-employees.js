'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('employees', 'nic', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('employees', 'address', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('employees', 'status', {
      type: Sequelize.ENUM('Active', 'Inactive', 'Resigned'),
      allowNull: false,
      defaultValue: 'Active'
    });
    await queryInterface.addColumn('employees', 'profile_photo', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('employees', 'join_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('employees', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    await queryInterface.addColumn('employees', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('employees', 'nic');
    await queryInterface.removeColumn('employees', 'address');
    await queryInterface.removeColumn('employees', 'status');
    await queryInterface.removeColumn('employees', 'profile_photo');
    await queryInterface.removeColumn('employees', 'join_date');
    await queryInterface.removeColumn('employees', 'created_at');
    await queryInterface.removeColumn('employees', 'updated_at');
  }
};
