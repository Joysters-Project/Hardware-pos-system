'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('po_items', {
      po_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'purchase_order',
          key: 'po_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'products',
          key: 'product_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total_price: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('po_items');
  }
};
