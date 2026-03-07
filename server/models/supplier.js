const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Suppliers', {
    supplier_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_name: { type: DataTypes.STRING(200), allowNull: false },
    contact: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: true },
    payment_terms: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' }
  }, { tableName: 'Suppliers', timestamps: false });
};