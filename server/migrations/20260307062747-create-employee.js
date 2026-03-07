'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Employee', {
      employee_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      first_name:    { type: Sequelize.STRING(50),  allowNull: false },
      last_name:     { type: Sequelize.STRING(50),  allowNull: false },
      hire_date:     { type: Sequelize.DATEONLY,    allowNull: false },
      salary:        { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      position:      { type: Sequelize.STRING(100), allowNull: false },
      email:         { type: Sequelize.STRING(150), allowNull: false, unique: true },
      phone_no:      { type: Sequelize.STRING(20),  unique: true },
      department_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Department', key: 'department_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Employee');
  }
};