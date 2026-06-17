const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('email_logs', {
    log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recipient_email: { type: DataTypes.STRING(255), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false }, // PO_CREATED, PAYMENT_RECEIPT, PAYMENT_OVERDUE
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
    reference_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(50), allowNull: false }, // sent, failed
    error_message: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'email_logs',
    timestamps: true,
    createdAt: 'sent_at',
    updatedAt: false
  });
};
