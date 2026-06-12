const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('returns', {
    return_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_id: { type: DataTypes.INTEGER, allowNull: false },
    return_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    total_refund_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    processed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' } },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'COMPLETED' },
    po_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'returns', timestamps: false });
};