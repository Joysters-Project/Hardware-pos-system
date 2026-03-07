'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bill_Items', {
      bill_id: {
        type: Sequelize.INTEGER, primaryKey: true, allowNull: false,
        references: { model: 'Bills', key: 'bill_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER, primaryKey: true, allowNull: false,
        references: { model: 'Products', key: 'product_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      quantity:    { type: Sequelize.INTEGER,      allowNull: false },
      total_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Bill_Items');
  }
};