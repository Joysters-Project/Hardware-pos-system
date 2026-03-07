const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Unit', {
    unit_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    unit_name: { type: DataTypes.STRING(50), allowNull: false, unique: true }
  }, { tableName: 'Unit', timestamps: false });
};