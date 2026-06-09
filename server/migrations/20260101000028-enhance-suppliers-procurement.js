'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('suppliers');

    const addIfMissing = async (col, def) => {
      if (!tableDesc[col]) {
        await queryInterface.addColumn('suppliers', col, def);
      }
    };

    await addIfMissing('supplier_code',    { type: Sequelize.STRING(50),  allowNull: true, unique: true });
    await addIfMissing('contact_person',   { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('phone',            { type: Sequelize.STRING(30),  allowNull: true });
    await addIfMissing('email',            { type: Sequelize.STRING(150), allowNull: true });
    await addIfMissing('company_reg',      { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('tax_id',           { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('credit_limit',     { type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 });
    await addIfMissing('performance_rating', { type: Sequelize.INTEGER, allowNull: true });
  },

  async down(queryInterface) {
    const cols = ['supplier_code', 'contact_person', 'phone', 'email', 'company_reg', 'tax_id', 'credit_limit', 'performance_rating'];
    for (const col of cols) {
      try { await queryInterface.removeColumn('suppliers', col); } catch (_) {}
    }
  }
};
