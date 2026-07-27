const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('supplier_payment_transactions', {
    txn_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Links to the invoice record
    payment_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    // Amount this transaction covers
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    payment_method: { type: DataTypes.STRING(50), allowNull: false },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },
    // Cheque-specific fields (null for non-cheque)
    cheque_number: { type: DataTypes.STRING(100), allowNull: true },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    cheque_date: { type: DataTypes.DATEONLY, allowNull: true },
    pending_cheque_date: { type: DataTypes.DATEONLY, allowNull: true },
    pending_days: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 3 },
    // Pending | Completed | Failed | Cancelled
    txn_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Pending' },
    // Only for cheque: Pending | Cleared | Bounced | Cancelled
    cheque_status: { type: DataTypes.STRING(30), allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true },
    // If this is a repayment, link to the failed txn
    repayment_for_txn_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  }, {
    tableName: 'supplier_payment_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};
