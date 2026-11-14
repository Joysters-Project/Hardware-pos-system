'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const alertsTable = await queryInterface.describeTable('alerts');
    if (!alertsTable.batch_id) {
      await queryInterface.addColumn('alerts', 'batch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'batch_inventory', key: 'batch_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const alertIndexes = await queryInterface.showIndex('alerts');
    if (!alertIndexes.some(index => index.name === 'uq_alerts_batch_alert_type')) {
      await queryInterface.addIndex('alerts', ['batch_id', 'alert_type'], {
        name: 'uq_alerts_batch_alert_type',
        unique: true,
      });
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.includes('expired_stock_disposals')) {
      await queryInterface.createTable('expired_stock_disposals', {
        disposal_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        batch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'batch_inventory', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        product_name: { type: Sequelize.STRING(200), allowNull: false },
        batch_number: { type: Sequelize.STRING(50), allowNull: false },
        expired_quantity: { type: Sequelize.INTEGER, allowNull: false },
        disposal_date: { type: Sequelize.DATEONLY, allowNull: false },
        disposal_reason: { type: Sequelize.TEXT, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expired_stock_disposals');
    await queryInterface.removeIndex('alerts', 'uq_alerts_batch_alert_type');
    await queryInterface.removeColumn('alerts', 'batch_id');
  },
};
