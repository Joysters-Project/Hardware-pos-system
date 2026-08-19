const db = require('../models');

async function ensureAlertsSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('alerts');
    const changes = [];

    if (!table.status) {
      changes.push(queryInterface.addColumn('alerts', 'status', {
        type: db.Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Active',
      }));
    }

    if (!table.purchase_order_id) {
      changes.push(queryInterface.addColumn('alerts', 'purchase_order_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true,
      }));
    }

    await Promise.all(changes);
    console.log('✅ Alerts schema verified/updated.');
  } catch (error) {
    console.error('⚠️ Alerts schema verification failed:', error.message);
  }
}

module.exports = ensureAlertsSchema;
