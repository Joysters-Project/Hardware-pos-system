const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('customers', {
    customer_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_name: { type: DataTypes.STRING(200), allowNull: false },
    phone_no: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true }
  }, { tableName: 'customers', timestamps: false });
};