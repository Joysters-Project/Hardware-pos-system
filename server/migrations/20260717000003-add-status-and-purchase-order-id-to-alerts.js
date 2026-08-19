'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('alerts', 'status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'Active',
    });

    await queryInterface.addColumn('alerts', 'purchase_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'purchase_orders',
        key: 'po_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('alerts', 'purchase_order_id');
    await queryInterface.removeColumn('alerts', 'status');
  }
};
