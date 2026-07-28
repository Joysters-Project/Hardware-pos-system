const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('supplier_services', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_item_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    service_type: { 
      type: DataTypes.ENUM('REPAIR', 'EXCHANGE'), 
      allowNull: false, 
      defaultValue: 'REPAIR' 
    },
    repair_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    customer_payment: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    status: { 
      type: DataTypes.ENUM('PENDING', 'SENT', 'COMPLETED'), 
      allowNull: false, 
      defaultValue: 'PENDING' 
    }
  }, { tableName: 'supplier_services', timestamps: true });
};
