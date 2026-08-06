const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('product_units', {
    product_unit_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    unit_id: { type: DataTypes.INTEGER, allowNull: false },
    conversion_factor: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true }
  }, { tableName: 'product_units', timestamps: false });
};
