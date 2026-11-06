'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('bills', 'expected_payment_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
      console.log('✅ Added expected_payment_date column to bills table.');
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column expected_payment_date already exists, skipping...');
      } else {
        throw err;
      }
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('bills', 'expected_payment_date');
    } catch (err) {
      console.log('Column expected_payment_date does not exist, skipping...');
    }
  }
};
