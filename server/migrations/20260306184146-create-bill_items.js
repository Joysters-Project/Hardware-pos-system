'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bill_items', {
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'bills',
          key: 'bill_id'
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
      // ADDED: The original price of the item at the time of sale
      // Why: If product price changes in the future, the bill remains historically accurate.
      price_per_unit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      // ADDED: The specific discount amount applied by the cashier for this line item
      // Why: To track exactly how much was discounted per item for your sales reports.
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
        // Note: total_price should be (quantity * price_per_unit) - discount
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bill_items');
  }
};