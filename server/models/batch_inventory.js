const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('batch_inventory', {
    batch_id:          { type: DataTypes.INTEGER,        primaryKey: true, autoIncrement: true },
    batch_number:      { type: DataTypes.STRING(50),     allowNull: false, unique: true },
    product_id:        { type: DataTypes.INTEGER,        allowNull: false },
    purchase_order_id: { type: DataTypes.INTEGER,        allowNull: true },
    supplier_id:       { type: DataTypes.INTEGER,        allowNull: true },
    purchase_price:    { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    received_quantity: { type: DataTypes.INTEGER,        allowNull: false, defaultValue: 0 },
    remaining_quantity:{ type: DataTypes.INTEGER,        allowNull: false, defaultValue: 0 },
    received_date:     { type: DataTypes.DATEONLY,       allowNull: false },
    expiry_date:       { type: DataTypes.DATEONLY,       allowNull: true },
    status:            { type: DataTypes.ENUM('Active', 'Low Stock', 'Expired', 'Disposed'), allowNull: false, defaultValue: 'Active' },
    disposed_at:       { type: DataTypes.DATE,           allowNull: true },
    created_at:        { type: DataTypes.DATE,           allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'batch_inventory', timestamps: false });
};
