const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('suppliers', {
    supplier_id:       { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    supplier_code:     { type: DataTypes.STRING(50),    allowNull: true,  unique: true },
    supplier_name:     { type: DataTypes.STRING(200),   allowNull: false },
    contact_person:    { type: DataTypes.STRING(100),   allowNull: true },
    phone:             { type: DataTypes.STRING(30),    allowNull: true },
    email:             { type: DataTypes.STRING(150),   allowNull: true },
    // Legacy field kept for backward compat with existing code referencing `contact`
    contact:           { type: DataTypes.STRING(100),   allowNull: true },
    address:           { type: DataTypes.TEXT,          allowNull: true },
    company_reg:       { type: DataTypes.STRING(100),   allowNull: true },
    tax_id:            { type: DataTypes.STRING(100),   allowNull: true },
    payment_terms:     { type: DataTypes.STRING(100),   allowNull: true },
    credit_limit:      { type: DataTypes.DECIMAL(15, 2),allowNull: true, defaultValue: 0 },
    performance_rating:{ type: DataTypes.INTEGER,       allowNull: true,  defaultValue: null },
    performance_score:  { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    performance_tier:   { type: DataTypes.STRING(50),    allowNull: false, defaultValue: 'Bronze' },
    on_time_delivery_pct:{ type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    avg_delay_days:     { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    order_success_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    total_purchase_volume:{ type: DataTypes.DECIMAL(15, 2),allowNull: false, defaultValue: 0.00 },
    status:            { type: DataTypes.STRING(20),    allowNull: false, defaultValue: 'Active' },
  }, { tableName: 'suppliers', timestamps: false });
};
