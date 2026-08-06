const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('employees', {
    employee_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    nic: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    phone_no: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    email: { type: DataTypes.STRING(150), allowNull: true, unique: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    position: { type: DataTypes.STRING(100), allowNull: true },
    salary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    salary_category: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'monthly' },
    join_date: { type: DataTypes.DATEONLY, allowNull: true },
    hire_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('Active', 'Inactive', 'Resigned'), allowNull: false, defaultValue: 'Active' },
    profile_photo: { type: DataTypes.STRING(255), allowNull: true },
    department_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'employees',
    timestamps: false
  });
};
