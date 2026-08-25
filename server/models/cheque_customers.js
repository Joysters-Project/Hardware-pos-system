const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('cheque_customers', {
    customer_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_name: { type: DataTypes.STRING(150), allowNull: false },
    nic_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    phone_number: { type: DataTypes.STRING(20), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
  }, {
    tableName: 'cheque_customers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};
