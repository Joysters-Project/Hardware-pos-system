const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('product_warranties', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    warranty_card_no: { type: DataTypes.STRING(100), allowNull: true },
    warranty_period: { type: DataTypes.INTEGER, allowNull: true, comment: 'Warranty period in months' },
    warranty_start: { type: DataTypes.DATEONLY, allowNull: true },
    warranty_end: { type: DataTypes.DATEONLY, allowNull: true }
  }, { tableName: 'product_warranties', timestamps: true });
};
