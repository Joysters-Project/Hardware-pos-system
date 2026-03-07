const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Category', {
    category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_name: { type: DataTypes.STRING(100), allowNull: false, unique: true }
  }, { tableName: 'Category', timestamps: false });
};