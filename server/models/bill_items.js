const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('bill_items', {
<<<<<<< HEAD
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bill_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
=======
    bill_id: { type: DataTypes.INTEGER, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, primaryKey: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // Snapshot price
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // Line item discount
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false } // (Qty * Price) - Discount
>>>>>>> c0c9f6e5e114c1a07e2770a41b0796c73d67d603
  }, { tableName: 'bill_items', timestamps: false });
};