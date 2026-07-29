'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('audit_log');

    if (!tableDesc.role) {
      await queryInterface.addColumn('audit_log', 'role', {
        type: Sequelize.STRING(50),
        allowNull: true,
        after: 'details'
      });
    }

    if (!tableDesc.ip_address) {
      await queryInterface.addColumn('audit_log', 'ip_address', {
        type: Sequelize.STRING(45),
        allowNull: true,
        after: 'role'
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('audit_log');
    if (tableDesc.ip_address) await queryInterface.removeColumn('audit_log', 'ip_address');
    if (tableDesc.role) await queryInterface.removeColumn('audit_log', 'role');
  }
};
