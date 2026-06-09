'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_log', {
      log_id:  { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      action:     { type: Sequelize.STRING(200), allowNull: false },
      time:       { type: Sequelize.DATE,         allowNull: false, defaultValue: Sequelize.NOW },
      details:    { type: Sequelize.TEXT,         allowNull: true },
      role:       { type: Sequelize.STRING(50),   allowNull: true },
      ip_address: { type: Sequelize.STRING(45),   allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('audit_log');
  }
};
