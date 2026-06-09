'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'reset_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('users', 'reset_token_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'reset_token_expiry');
    await queryInterface.removeColumn('users', 'reset_token');
  }
};
