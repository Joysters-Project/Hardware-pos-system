'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false
      },
      user_name:   { type: Sequelize.STRING(100), allowNull: false, unique: true },
      first_name:  { type: Sequelize.STRING(50),  allowNull: false },
      last_name:   { type: Sequelize.STRING(50),  allowNull: false },
      password:    { type: Sequelize.STRING(255), allowNull: false },
      role:        { type: Sequelize.STRING(50),  allowNull: false },
      status:      { type: Sequelize.STRING(20),  allowNull: false, defaultValue: 'Active' },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: true, unique: true,
        references: { model: 'employees', key: 'employee_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      // Account security columns
      failed_attempts:    { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_locked:          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      lock_time:          { type: Sequelize.DATE,    allowNull: true,  defaultValue: null },
      // Password reset columns — no unique index to avoid MySQL 64-key limit
      reset_token:        { type: Sequelize.STRING(255), allowNull: true, defaultValue: null },
      reset_token_expiry: { type: Sequelize.DATE,        allowNull: true, defaultValue: null }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
