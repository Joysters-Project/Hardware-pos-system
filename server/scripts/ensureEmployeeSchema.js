const db = require('../models');

async function ensureEmployeeSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('employees');
    const changes = [];

    if (!table.salary_category) {
      changes.push(queryInterface.addColumn('employees', 'salary_category', {
        type: db.Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'monthly',
      }));
    }

    if (!table.hire_date) {
      changes.push(queryInterface.addColumn('employees', 'hire_date', {
        type: db.Sequelize.DATEONLY,
        allowNull: true,
      }));
    }

    if (!table.join_date) {
      changes.push(queryInterface.addColumn('employees', 'join_date', {
        type: db.Sequelize.DATEONLY,
        allowNull: true,
      }));
    }

    await Promise.all(changes);
    console.log('✅ Employee schema verified/updated for profile and salary flows.');
  } catch (error) {
    console.error('⚠️ Employee schema verification failed:', error.message);
  }
}

module.exports = ensureEmployeeSchema;
