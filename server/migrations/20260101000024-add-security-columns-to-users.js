'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add failed_attempts column
    try {
      await queryInterface.addColumn('users', 'failed_attempts', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column failed_attempts already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add is_locked column
    try {
      await queryInterface.addColumn('users', 'is_locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column is_locked already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add lock_time column
    try {
      await queryInterface.addColumn('users', 'lock_time', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column lock_time already exists, skipping...');
      } else {
        throw err;
      }
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove the columns in reverse order
    try {
      await queryInterface.removeColumn('users', 'lock_time');
    } catch (err) {
      console.log('Column lock_time does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('users', 'is_locked');
    } catch (err) {
      console.log('Column is_locked does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('users', 'failed_attempts');
    } catch (err) {
      console.log('Column failed_attempts does not exist, skipping...');
    }
  }
};
