'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Purchase_Order', {
      po_id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      po_date:           { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
      expected_delivery: { type: Sequelize.DATEONLY, allowNull: true },
      status:            { type: Sequelize.STRING(50),   allowNull: false },
      total_amount:      { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      supplier_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Suppliers', key: 'supplier_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Purchase_Order');
  }
};