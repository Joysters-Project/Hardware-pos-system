const db = require('../models');

async function ensureProjectSchema() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('projects');
    const changes = [];

    if (!table.project_owner) {
      changes.push(queryInterface.addColumn('projects', 'project_owner', {
        type: db.Sequelize.STRING(150),
        allowNull: true,
      }));
    }

    if (!table.location) {
      changes.push(queryInterface.addColumn('projects', 'location', {
        type: db.Sequelize.STRING(255),
        allowNull: true,
      }));
    }

    if (!table.deadline) {
      changes.push(queryInterface.addColumn('projects', 'deadline', {
        type: db.Sequelize.DATEONLY,
        allowNull: true,
      }));
    }

    if (!table.end_date) {
      changes.push(queryInterface.addColumn('projects', 'end_date', {
        type: db.Sequelize.DATEONLY,
        allowNull: true,
      }));
    }

    if (!table.final_cost) {
      changes.push(queryInterface.addColumn('projects', 'final_cost', {
        type: db.Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: null,
      }));
    }

    if (!table.project_departments) {
      changes.push(queryInterface.addColumn('projects', 'project_departments', {
        type: db.Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]',
      }));
    }

    if (!table.amount_paid) {
      changes.push(queryInterface.addColumn('projects', 'amount_paid', {
        type: db.Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      }));
    }

    if (!table.created_by) {
      changes.push(queryInterface.addColumn('projects', 'created_by', {
        type: db.Sequelize.INTEGER,
        allowNull: false,
      }));
    }

    // Ensure receiver_name in project_items table
    const itemTable = await queryInterface.describeTable('project_items');
    if (!itemTable.receiver_name) {
      changes.push(queryInterface.addColumn('project_items', 'receiver_name', {
        type: db.Sequelize.STRING(150),
        allowNull: true,
      }));
    }

    if (!itemTable.receiver_phone) {
      changes.push(queryInterface.addColumn('project_items', 'receiver_phone', {
        type: db.Sequelize.STRING(30),
        allowNull: true,
      }));
    }

    if (!itemTable.transaction_ref) {
      changes.push(queryInterface.addColumn('project_items', 'transaction_ref', {
        type: db.Sequelize.STRING(64),
        allowNull: true,
      }));
    }

    if (changes.length) {
      await Promise.all(changes);
    }

    console.log('✅ Project schema verified/updated for project creation flow.');
  } catch (error) {
    console.error('⚠️ Project schema verification failed:', error.message);
  }
}

module.exports = ensureProjectSchema;
