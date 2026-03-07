const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('units', {
    unit_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    unit_name: { type: DataTypes.STRING(50), allowNull: false, unique: true }
  }, { tableName: 'units', timestamps: false });
};