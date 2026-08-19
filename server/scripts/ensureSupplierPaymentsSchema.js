const db = require('../models');

async function ensureSupplierPaymentsSchema() {
  try {
    const qi = db.sequelize.getQueryInterface();
    const table = await qi.describeTable('supplier_payments');
    const changes = [];

    if (!table.cheque_number) {
      changes.push(qi.addColumn('supplier_payments', 'cheque_number', {
        type: db.Sequelize.STRING(100), allowNull: true,
      }));
    }
    if (!table.bank_name) {
      changes.push(qi.addColumn('supplier_payments', 'bank_name', {
        type: db.Sequelize.STRING(100), allowNull: true,
      }));
    }
    if (!table.cheque_date) {
      changes.push(qi.addColumn('supplier_payments', 'cheque_date', {
        type: db.Sequelize.DATEONLY, allowNull: true,
      }));
    }
    if (!table.pending_cheque_date) {
      changes.push(qi.addColumn('supplier_payments', 'pending_cheque_date', {
        type: db.Sequelize.DATEONLY, allowNull: true,
      }));
    }
    if (!table.cheque_status) {
      changes.push(qi.addColumn('supplier_payments', 'cheque_status', {
        type: db.Sequelize.STRING(30), allowNull: true, defaultValue: null,
      }));
    }

    await Promise.all(changes);
    console.log('✅ supplier_payments schema verified/updated.');
  } catch (error) {
    console.error('⚠️ supplier_payments schema verification failed:', error.message);
  }
}

module.exports = ensureSupplierPaymentsSchema;
