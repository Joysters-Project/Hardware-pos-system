const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('expired_stock_disposals', {
  disposal_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  batch_id: { type: DataTypes.INTEGER, allowNull: true },
  product_name: { type: DataTypes.STRING(200), allowNull: false },
  batch_number: { type: DataTypes.STRING(50), allowNull: false },
  expired_quantity: { type: DataTypes.INTEGER, allowNull: false },
  disposal_date: { type: DataTypes.DATEONLY, allowNull: false },
  disposal_reason: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'expired_stock_disposals',
  timestamps: false,
});
