'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add failed_attempts column
    await queryInterface.addColumn('users', 'failed_attempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    // Add is_locked column
    await queryInterface.addColumn('users', 'is_locked', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add lock_time column
    await queryInterface.addColumn('users', 'lock_time', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the columns in reverse order
    await queryInterface.removeColumn('users', 'lock_time');
    await queryInterface.removeColumn('users', 'is_locked');
    await queryInterface.removeColumn('users', 'failed_attempts');
  }
};
