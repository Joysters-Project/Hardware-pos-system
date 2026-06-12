const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('supplier_payments', {
    payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    po_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_number: { type: DataTypes.STRING(100), allowNull: false },
    invoice_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    paid_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    balance_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },
    payment_method: { type: DataTypes.STRING(50), allowNull: true },
    payment_status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'Pending' },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'supplier_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
