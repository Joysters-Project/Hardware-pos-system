const db = require('../models');

async function ensureSupplierPaymentSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('supplier_payments');

    if (!table.clearing_date) {
      await queryInterface.addColumn('supplier_payments', 'clearing_date', {
        type: db.Sequelize.DATEONLY,
        allowNull: true,
      });
      console.log('✅ supplier_payments.clearing_date column added.');
    }
  } catch (error) {
    console.error('⚠️ ensureSupplierPaymentSchema failed:', error.message);
  }
}

module.exports = ensureSupplierPaymentSchema;
