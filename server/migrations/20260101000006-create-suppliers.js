'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suppliers', {
      supplier_id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      supplier_code:       { type: Sequelize.STRING(50), allowNull: true, unique: true },
      supplier_name:       { type: Sequelize.STRING(200), allowNull: false },
      contact:             { type: Sequelize.STRING(100), allowNull: true },
      contact_person:      { type: Sequelize.STRING(100), allowNull: true },
      phone:               { type: Sequelize.STRING(30), allowNull: true },
      email:               { type: Sequelize.STRING(150), allowNull: true },
      address:             { type: Sequelize.TEXT, allowNull: true },
      company_reg:         { type: Sequelize.STRING(100), allowNull: true },
      tax_id:              { type: Sequelize.STRING(100), allowNull: true },
      payment_terms:       { type: Sequelize.STRING(100), allowNull: true },
      credit_limit:        { type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      performance_rating:  { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
      status:              { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'Active' }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('suppliers');
  }
};