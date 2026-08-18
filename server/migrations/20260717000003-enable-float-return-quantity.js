'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('return_items', 'return_quantity', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00
    });
    await queryInterface.changeColumn('return_items', 'quantity', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00
    });
    await queryInterface.changeColumn('supplier_returns', 'quantity', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('return_items', 'return_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.changeColumn('return_items', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.changeColumn('supplier_returns', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  }
};
