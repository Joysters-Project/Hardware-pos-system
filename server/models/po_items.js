const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('po_items', {
    po_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    product_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, { tableName: 'po_items', timestamps: false });
};