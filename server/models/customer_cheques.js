const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('customer_cheques', {
    cheque_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },

    // Cheque Details
    cheque_number: { type: DataTypes.STRING(100), allowNull: false },
    bank_name: { type: DataTypes.STRING(100), allowNull: false },
    account_holder_name: { type: DataTypes.STRING(150), allowNull: false },
    cheque_date: { type: DataTypes.DATEONLY, allowNull: false },
    expected_clearance_date: { type: DataTypes.DATEONLY, allowNull: false },

    // Financial Details
    cheque_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    service_charge: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    amount_paid_to_customer: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },

    // Status
    cheque_status: {
      type: DataTypes.ENUM('Pending', 'Cleared', 'Bounced', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Pending',
    },

    // Important Dates
    received_date: { type: DataTypes.DATEONLY, allowNull: false },
    deposited_date: { type: DataTypes.DATEONLY, allowNull: true },
    cleared_date: { type: DataTypes.DATEONLY, allowNull: true },

    // Repayment
    repayment_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    repayment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    repayment_status: {
      type: DataTypes.ENUM('Pending', 'Paid', 'Not Required'),
      allowNull: false,
      defaultValue: 'Not Required',
    },

    // Additional
    remarks: { type: DataTypes.TEXT, allowNull: true },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'customer_cheques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};
