const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('payments', {
    payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    amount_paid: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    payment_method: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'CASH' },
    collected_by: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'payments', timestamps: false });
};