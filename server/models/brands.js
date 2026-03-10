const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('brands', {
    brand_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    brand_name: { type: DataTypes.STRING(100), allowNull: false, unique: true }
  }, { tableName: 'brands', timestamps: false });
};