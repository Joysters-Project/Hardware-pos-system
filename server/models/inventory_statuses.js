const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('inventory_statuses', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    available_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    repair_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    damaged_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 }
  }, { tableName: 'inventory_statuses', timestamps: true });
};
