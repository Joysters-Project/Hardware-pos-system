const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(50), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    employee_id: { type: DataTypes.INTEGER, unique: true }
  }, { tableName: 'User', timestamps: false });
};