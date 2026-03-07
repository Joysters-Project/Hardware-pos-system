const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('employees', {
    employee_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    hire_date: { type: DataTypes.DATEONLY, allowNull: false },
    salary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    position: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    phone_no: { type: DataTypes.STRING(20), unique: true },
    department_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'employees', timestamps: false });
};