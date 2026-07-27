'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_items', {
      item_id:    { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      project_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'projects', key: 'project_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'products', key: 'product_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      quantity:   { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      note:       { type: Sequelize.STRING(255), allowNull: true },
      taken_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      taken_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('project_items');
  }
};
