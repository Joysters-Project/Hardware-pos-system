'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('return_items', 'unit_name', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('return_items', 'unit_name');
  }
};
