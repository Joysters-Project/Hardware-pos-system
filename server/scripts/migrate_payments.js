const db = require('../models');

async function migrate() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    
    // Rename payment_status to payment_method
    await queryInterface.renameColumn('payments', 'payment_status', 'payment_method');
    console.log("Renamed payment_status to payment_method successfully.");
    
    // Add collected_by column
    await queryInterface.addColumn('payments', 'collected_by', {
      type: db.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    });
    console.log("Added collected_by column successfully.");
    
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
