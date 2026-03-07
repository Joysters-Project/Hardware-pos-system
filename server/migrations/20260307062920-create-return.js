'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Returns', {
      return_id:       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      bill_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Bills', key: 'bill_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      product_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Products', key: 'product_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      return_date:     { type: Sequelize.DATE,         allowNull: false, defaultValue: Sequelize.NOW },
      return_quantity: { type: Sequelize.INTEGER,      allowNull: false },
      refund_amount:   { type: Sequelize.DECIMAL(10, 2), allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Returns');
  }
};