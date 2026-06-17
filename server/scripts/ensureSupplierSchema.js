const db = require('../models');

async function ensureSupplierSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('suppliers');

    const changes = [];

    if (!table.supplier_code) {
      changes.push(queryInterface.addColumn('suppliers', 'supplier_code', {
        type: db.Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      }));
    }

    if (!table.contact_person) {
      changes.push(queryInterface.addColumn('suppliers', 'contact_person', {
        type: db.Sequelize.STRING(100),
        allowNull: true,
      }));
    }

    if (!table.phone) {
      changes.push(queryInterface.addColumn('suppliers', 'phone', {
        type: db.Sequelize.STRING(30),
        allowNull: true,
      }));
    }

    if (!table.email) {
      changes.push(queryInterface.addColumn('suppliers', 'email', {
        type: db.Sequelize.STRING(150),
        allowNull: true,
      }));
    }

    if (!table.company_reg) {
      changes.push(queryInterface.addColumn('suppliers', 'company_reg', {
        type: db.Sequelize.STRING(100),
        allowNull: true,
      }));
    }

    if (!table.tax_id) {
      changes.push(queryInterface.addColumn('suppliers', 'tax_id', {
        type: db.Sequelize.STRING(100),
        allowNull: true,
      }));
    }

    if (!table.payment_terms) {
      changes.push(queryInterface.addColumn('suppliers', 'payment_terms', {
        type: db.Sequelize.STRING(100),
        allowNull: true,
      }));
    }

    if (!table.credit_limit) {
      changes.push(queryInterface.addColumn('suppliers', 'credit_limit', {
        type: db.Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
      }));
    }

    if (!table.performance_rating) {
      changes.push(queryInterface.addColumn('suppliers', 'performance_rating', {
        type: db.Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      }));
    }

    await Promise.all(changes);
    console.log('✅ Supplier schema verified/updated for procurement usage.');
  } catch (error) {
    console.error('⚠️ Supplier schema verification failed:', error.message);
  }
}

module.exports = ensureSupplierSchema;
