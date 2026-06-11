'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
      employee_id: {
        type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false
      },
      first_name:  { type: Sequelize.STRING(50),  allowNull: false },
      last_name:   { type: Sequelize.STRING(50),  allowNull: false },
      hire_date:   { type: Sequelize.DATEONLY,    allowNull: true },
      join_date:   { type: Sequelize.DATEONLY,    allowNull: true },
      salary:      { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      position:    { type: Sequelize.STRING(100), allowNull: true },
      email:       { type: Sequelize.STRING(150), allowNull: true, unique: true },
      phone_no:    { type: Sequelize.STRING(20),  allowNull: true, unique: true },
      nic:         { type: Sequelize.STRING(20),  allowNull: true, unique: true },
      address:     { type: Sequelize.TEXT,        allowNull: true },
      profile_photo: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('Active', 'Inactive', 'Resigned'),
        allowNull: false, defaultValue: 'Active'
      },
      department_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'departments', key: 'department_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
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
    await queryInterface.dropTable('employees');
  }
};
