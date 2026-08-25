const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('supplier_returns', {
    supplier_return_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    return_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'PENDING_APPROVAL'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'supplier_returns',
    timestamps: false
  });
};
