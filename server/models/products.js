const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('products', {
    product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    min_stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorder_level: { type: DataTypes.INTEGER, allowNull: false },
    reorder_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    preferred_supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    avg_daily_sales: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    type: { type: DataTypes.STRING(50), allowNull: false },
    batch_no: { type: DataTypes.STRING(100), allowNull: true },
    expiry_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    brand_id: { type: DataTypes.INTEGER, allowNull: true },
    unit_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'products', timestamps: false });
};
