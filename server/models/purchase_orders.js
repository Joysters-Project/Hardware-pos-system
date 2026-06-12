const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('purchase_orders', {
    po_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    po_number: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    po_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    expected_delivery: { type: DataTypes.DATEONLY, allowNull: true },
    actual_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'purchase_orders', timestamps: false });
};