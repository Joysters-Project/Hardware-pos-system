const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('departments', {
    department_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    department_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    used_budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' }
  }, {
    tableName: 'departments',
    timestamps: false
  });
};
