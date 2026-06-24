const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('auto_reorder_suggestions', {
    suggestion_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    current_stock: { type: DataTypes.INTEGER, allowNull: false },
    reorder_level: { type: DataTypes.INTEGER, allowNull: false },
    suggested_quantity: { type: DataTypes.INTEGER, allowNull: false },
    estimated_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'Pending' }, // Pending, Approved, Rejected, Converted
    converted_po_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'auto_reorder_suggestions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
