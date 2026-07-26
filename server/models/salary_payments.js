
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('salary_payments', {
    salary_payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id:       { type: DataTypes.INTEGER, allowNull: false },
    salary_category:   { type: DataTypes.ENUM('monthly', 'daily'), allowNull: false, defaultValue: 'monthly' },
    basic_salary:      { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    bonus_amount:      { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    deduction_amount:  { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    final_salary:      { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    payment_month:     { type: DataTypes.INTEGER, allowNull: true },
    payment_year:      { type: DataTypes.INTEGER, allowNull: true },
    payment_date:      { type: DataTypes.DATEONLY, allowNull: true },
    payment_status:    { type: DataTypes.ENUM('Pending', 'Paid'), allowNull: false, defaultValue: 'Pending' },
    payment_method:    { type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Cheque'), allowNull: true },
    remarks:           { type: DataTypes.TEXT, allowNull: true },
    payslip_pdf_path:  { type: DataTypes.STRING(255), allowNull: true }
  }, {
    tableName: 'salary_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['employee_id', 'payment_month', 'payment_year'], name: 'salary_monthly_lookup' },
      { fields: ['employee_id', 'payment_date'], name: 'salary_daily_lookup' }
    ]
  });
};
