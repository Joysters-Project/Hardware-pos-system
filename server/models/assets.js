const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('assets', {
    asset_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    asset_name: { type: DataTypes.STRING(150), allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
    cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    purchase_date: { type: DataTypes.DATEONLY, allowNull: false },
    expiration_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('Active', 'Maintenance', 'Damaged', 'Lost', 'Disposed'),
      allowNull: false,
      defaultValue: 'Active'
    },
    condition_type: {
      type: DataTypes.ENUM('New', 'Good', 'Fair', 'Poor', 'Damaged', 'Other'),
      allowNull: false,
      defaultValue: 'Good'
    },
    custom_condition: { type: DataTypes.STRING(255), allowNull: true }
  }, {
    tableName: 'assets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
