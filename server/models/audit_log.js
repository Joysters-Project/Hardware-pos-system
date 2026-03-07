const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('audit_log', {
    log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(200), allowNull: false },
    time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    details: { type: DataTypes.TEXT, allowNull: true }
  }, { tableName: 'audit_log', timestamps: false });
};