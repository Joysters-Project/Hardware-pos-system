const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Alerts', {
    alert_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    alert_type: { type: DataTypes.STRING(100), allowNull: false },
    is_resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    resolved_date: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'Alerts', timestamps: false });
};