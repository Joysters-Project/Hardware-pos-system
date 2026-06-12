'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assets', {
      asset_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      asset_name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'department_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      purchase_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      expiration_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Active', 'Maintenance', 'Damaged', 'Lost', 'Disposed'),
        allowNull: false,
        defaultValue: 'Active'
      },
      condition_type: {
        type: Sequelize.ENUM('New', 'Good', 'Fair', 'Poor', 'Damaged', 'Other'),
        allowNull: false,
        defaultValue: 'Good'
      },
      custom_condition: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assets');
  }
};
