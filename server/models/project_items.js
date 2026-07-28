const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('project_items', {
    item_id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    project_id:  { type: DataTypes.INTEGER, allowNull: false },
    product_id:  { type: DataTypes.INTEGER, allowNull: false },
    quantity:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    unit_price:  { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // snapshot at time of taking
    note:        { type: DataTypes.STRING(255), allowNull: true },
    taken_by:    { type: DataTypes.INTEGER, allowNull: false }, // user_id (cashier)
    taken_at:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'project_items',
    timestamps: false,
  });
};
