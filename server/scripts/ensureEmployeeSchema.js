const db = require('../models');
const { DataTypes } = require('sequelize');

const ensureEmployeeSchema = async () => {
  try {
    const queryInterface = db.sequelize.getQueryInterface();

    // ── employees table ───────────────────────────────────────────────────────
    const empDesc = await queryInterface.describeTable('employees');

    if (!empDesc.salary_category) {
      await queryInterface.addColumn('employees', 'salary_category', {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'monthly',
      });
      console.log('✅ Added missing column: employees.salary_category');
    }

    if (!empDesc.join_date) {
      await queryInterface.addColumn('employees', 'join_date', {
        type: DataTypes.DATEONLY,
        allowNull: true,
      });
      console.log('✅ Added missing column: employees.join_date');
    }

    if (!empDesc.hire_date) {
      await queryInterface.addColumn('employees', 'hire_date', {
        type: DataTypes.DATEONLY,
        allowNull: true,
      });
      console.log('✅ Added missing column: employees.hire_date');
    }

    if (!empDesc.profile_photo) {
      await queryInterface.addColumn('employees', 'profile_photo', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('✅ Added missing column: employees.profile_photo');
    }

    // ── salary_payments table ─────────────────────────────────────────────────
    const salaryDesc = await queryInterface.describeTable('salary_payments').catch(() => null);
    if (salaryDesc && !salaryDesc.salary_category) {
      await queryInterface.addColumn('salary_payments', 'salary_category', {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'monthly',
      });
      console.log('✅ Added missing column: salary_payments.salary_category');
    }

  } catch (error) {
    console.error('❌ Failed to ensure employee/salary schema:', error.message);
  }
};

module.exports = ensureEmployeeSchema;
