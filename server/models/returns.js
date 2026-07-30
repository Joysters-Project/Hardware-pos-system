const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('returns', {
    return_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: true },
    return_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    return_type: { 
      type: DataTypes.ENUM('REFUND', 'REPAIR', 'EXCHANGE', 'SUPPLIER_RETURN'),
      allowNull: false,
      defaultValue: 'REFUND'
    },
    status: { 
      type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'SENT_TO_SUPPLIER', 'REPAIRED', 'COMPLETED', 'REJECTED'),
      allowNull: false, 
      defaultValue: 'COMPLETED' 
    },
    reason: { type: DataTypes.TEXT, allowNull: true },
    total_refund_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    processed_by: { type: DataTypes.INTEGER, allowNull: true },
    po_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'returns', timestamps: false });
};