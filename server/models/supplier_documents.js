const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('supplier_documents', {
    document_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    document_type: { type: DataTypes.STRING(100), allowNull: false }, // Contract, Invoice, Receipt, Statement
    file_name: { type: DataTypes.STRING(255), allowNull: false },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    file_size: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'supplier_documents',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: false
  });
};
