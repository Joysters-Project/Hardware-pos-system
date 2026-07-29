const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('po_items', {
    id:          { type: DataTypes.INTEGER,        primaryKey: true, autoIncrement: true },
    po_id:       { type: DataTypes.INTEGER,        allowNull: false },
    product_id:  { type: DataTypes.INTEGER,        allowNull: false },
    quantity:    { type: DataTypes.INTEGER,        allowNull: false, validate: { min: 1 } },
    unit_price:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    comment:     { type: DataTypes.TEXT,           allowNull: true,  defaultValue: null },
  }, { tableName: 'po_items', timestamps: false });
};
