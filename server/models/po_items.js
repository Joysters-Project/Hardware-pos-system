const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PO_Items', {
    po_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    product_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, { tableName: 'PO_Items', timestamps: false });
};