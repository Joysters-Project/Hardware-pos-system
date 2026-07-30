'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('suppliers');

    const addIfMissing = async (columnName, definition) => {
      if (!table[columnName]) {
        await queryInterface.addColumn('suppliers', columnName, definition);
      }
    };

    await addIfMissing('contact_person', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('phone', {
      type: Sequelize.STRING(30),
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('email', {
      type: Sequelize.STRING(150),
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('company_reg', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('tax_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('performance_rating', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });

    await addIfMissing('credit_limit', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    });

    if (!table.contact_person && table.contact) {
      await queryInterface.sequelize.query(
        'UPDATE suppliers SET contact_person = contact WHERE contact_person IS NULL'
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('suppliers');

    if (table.contact_person) await queryInterface.removeColumn('suppliers', 'contact_person');
    if (table.phone) await queryInterface.removeColumn('suppliers', 'phone');
    if (table.email) await queryInterface.removeColumn('suppliers', 'email');
    if (table.company_reg) await queryInterface.removeColumn('suppliers', 'company_reg');
    if (table.tax_id) await queryInterface.removeColumn('suppliers', 'tax_id');
    if (table.performance_rating) await queryInterface.removeColumn('suppliers', 'performance_rating');
    if (table.credit_limit) await queryInterface.removeColumn('suppliers', 'credit_limit');
  },
};
