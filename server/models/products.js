const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('products', {
    product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    min_stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorder_level: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    batch_no: { type: DataTypes.STRING(100), allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    brand_id: { type: DataTypes.INTEGER, allowNull: true },
    unit_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'products', timestamps: false });
};
