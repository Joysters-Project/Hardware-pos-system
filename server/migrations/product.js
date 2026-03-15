const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Product', {
    product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    reorder_level: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false } // Medicine, General, etc.
  });
};