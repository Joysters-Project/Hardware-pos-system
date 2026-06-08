const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('return_items', {
    return_item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    return_quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    return_reason: { type: DataTypes.STRING(255), allowNull: false },
    destination: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'STOCK' },
    destination_note: { type: DataTypes.TEXT, allowNull: true },
    exchange_product_id: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'return_items', timestamps: false });
};
