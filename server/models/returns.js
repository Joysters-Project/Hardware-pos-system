const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('returns', {
    return_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    return_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    return_quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    destination: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'STOCK' },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'COMPLETED' },
    po_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    debit_note_raised: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { tableName: 'returns', timestamps: false });
};