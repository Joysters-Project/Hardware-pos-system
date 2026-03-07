const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('departments', {
    department_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    department_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }
  }, { tableName: 'departments', timestamps: false });
};