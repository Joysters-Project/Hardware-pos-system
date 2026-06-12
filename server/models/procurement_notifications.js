const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('procurement_notifications', {
    notification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(50), allowNull: false }, // PO_CREATED, PO_APPROVED, PAYMENT_DUE, AUTO_REORDER, FORECAST_WARNING
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    reference_type: { type: DataTypes.STRING(50), allowNull: true }, // purchase_order, supplier, payment, product
    reference_id: { type: DataTypes.INTEGER, allowNull: true },
    severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'info' }, // info, warning, critical
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'unread' } // unread, read, archived
  }, {
    tableName: 'procurement_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
