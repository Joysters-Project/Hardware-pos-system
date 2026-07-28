'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      project_id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      project_name: { type: Sequelize.STRING(200), allowNull: false },
      project_type: {
        type: Sequelize.ENUM('Welding', 'Timber', 'Hardware', 'Other'),
        allowNull: false, defaultValue: 'Hardware'
      },
      description:  { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('Active', 'Completed', 'On Hold', 'Cancelled'),
        allowNull: false, defaultValue: 'Active'
      },
      start_date:   { type: Sequelize.DATEONLY, allowNull: false },
      end_date:     { type: Sequelize.DATEONLY, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('projects');
  }
};
