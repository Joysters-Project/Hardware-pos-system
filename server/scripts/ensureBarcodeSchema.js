const db = require('../models');

async function ensureBarcodeSchema() {
  try {
    const migration = require('../migrations/20261106000001-add-barcode-unique-indexes');
    const queryInterface = db.sequelize.getQueryInterface();
    await migration.up(queryInterface, db.Sequelize);
    console.log('✅ Barcode unique schema & indexes verified.');
  } catch (error) {
    console.error('⚠️ Barcode schema verification error:', error.message);
  }
}

module.exports = ensureBarcodeSchema;

