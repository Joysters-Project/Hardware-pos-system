const db = require('../models');

async function ensureAlertSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    await db.alerts.sync();

    const alertsTable = await queryInterface.describeTable('alerts');

    if (!alertsTable.status) {
      console.log('⚡ Adding missing status column to alerts table...');
      await queryInterface.addColumn('alerts', 'status', {
        type: db.Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Active'
      });
    }

    if (!alertsTable.purchase_order_id) {
      console.log('⚡ Adding missing purchase_order_id column to alerts table...');
      await queryInterface.addColumn('alerts', 'purchase_order_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true
      });
    }

    const billsTable = await queryInterface.describeTable('bills');
    if (!billsTable.expected_payment_date) {
      console.log('⚡ Adding missing expected_payment_date column to bills table...');
      await queryInterface.addColumn('bills', 'expected_payment_date', {
        type: db.Sequelize.DATEONLY,
        allowNull: true
      });
    }

    console.log('✅ Alerts schema verified/updated successfully.');
  } catch (error) {
    console.error('⚠️ Alerts schema verification failed:', error.message);
  }
}

module.exports = ensureAlertSchema;
