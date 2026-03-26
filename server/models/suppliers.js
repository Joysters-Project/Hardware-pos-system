const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('suppliers', {
    supplier_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    supplier_name: { type: DataTypes.STRING(200), allowNull: false },
    contact: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: true },
    payment_terms: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    performance_rating: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null } // 1-5 rating
  }, { tableName: 'suppliers', timestamps: false });
};