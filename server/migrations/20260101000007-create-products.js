'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      product_id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_name:      { type: Sequelize.STRING(200), allowNull: false },
      unit_price:        { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      cost_price:        { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      stock_quantity:    { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      min_stock_quantity:{ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level:     { type: Sequelize.INTEGER, allowNull: false },
      type:              { type: Sequelize.STRING(50), allowNull: false },
      expiry_date:       { type: Sequelize.DATE, allowNull: true },
      batch_no:          { type: Sequelize.STRING(100), allowNull: true },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'category', key: 'category_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      brand_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'brands', key: 'brand_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      unit_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'units', key: 'unit_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('products');
  }
};
