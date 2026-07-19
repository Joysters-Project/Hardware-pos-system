'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('products');

    if (tableDesc.repair_quantity) {
      await queryInterface.removeColumn('products', 'repair_quantity');
    }
    if (tableDesc.damaged_quantity) {
      await queryInterface.removeColumn('products', 'damaged_quantity');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'repair_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('products', 'damaged_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
};
