'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Alerts', {
      alert_id:     { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Products', key: 'product_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      alert_type:    { type: Sequelize.STRING(100), allowNull: false },
      is_resolved:   { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: false },
      resolved_date: { type: Sequelize.DATE,         allowNull: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Alerts');
  }
};