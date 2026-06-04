const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('expenses', {
    expense_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    expense_type: {
      type: DataTypes.ENUM('Asset Purchase', 'Salary', 'Utility Bills', 'Maintenance', 'Transport', 'Office Supplies', 'Other'),
      allowNull: false
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    expense_date: { type: DataTypes.DATEONLY, allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
    asset_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'expenses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
