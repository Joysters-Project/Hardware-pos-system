'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('products');

    if (!tableDesc.reorder_quantity) {
      await queryInterface.addColumn('products', 'reorder_quantity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    if (!tableDesc.preferred_supplier_id) {
      await queryInterface.addColumn('products', 'preferred_supplier_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'supplier_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!tableDesc.avg_daily_sales) {
      await queryInterface.addColumn('products', 'avg_daily_sales', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('products');

    if (tableDesc.reorder_quantity) {
      await queryInterface.removeColumn('products', 'reorder_quantity');
    }
    if (tableDesc.preferred_supplier_id) {
      await queryInterface.removeColumn('products', 'preferred_supplier_id');
    }
    if (tableDesc.avg_daily_sales) {
      await queryInterface.removeColumn('products', 'avg_daily_sales');
    }
  }
};
