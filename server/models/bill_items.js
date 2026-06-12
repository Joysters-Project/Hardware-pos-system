const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('bill_items', {
    bill_id: { type: DataTypes.INTEGER, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, primaryKey: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, 
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, { tableName: 'bill_items', timestamps: false });
};