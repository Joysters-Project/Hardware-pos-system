const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Bills', {
    bill_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    bill_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'Bills', timestamps: false });
};