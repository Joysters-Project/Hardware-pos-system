const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('return_items', {
    return_item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    return_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1.00, validate: { min: 0.0001 } },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1.00 },
    condition: { 
      type: DataTypes.ENUM('DAMAGED', 'GOOD', 'DEFECTIVE'),
      allowNull: false,
      defaultValue: 'DEFECTIVE'
    },
    action: { 
      type: DataTypes.ENUM('REFUND', 'REPAIR', 'EXCHANGE', 'SCRAP', 'SUPPLIER_RETURN'),
      allowNull: false,
      defaultValue: 'REFUND'
    },
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    return_reason: { type: DataTypes.STRING(255), allowNull: true },
    destination: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'STOCK' },
    destination_note: { type: DataTypes.TEXT, allowNull: true },
    exchange_product_id: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'return_items', timestamps: false });
};

