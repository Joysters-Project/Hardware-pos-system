const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('audit_log', {
    log_id:     { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true, allowNull: false },
    user_id:    { type: DataTypes.INTEGER,      allowNull: false },
    action:     { type: DataTypes.STRING(200),  allowNull: false },
    details:    { type: DataTypes.TEXT,         allowNull: true },
    time:       { type: DataTypes.DATE,         allowNull: false, defaultValue: DataTypes.NOW },
    role:       { type: DataTypes.STRING(50),   allowNull: true },
    ip_address: { type: DataTypes.STRING(45),   allowNull: true },
  }, { tableName: 'audit_log', timestamps: false });
};
