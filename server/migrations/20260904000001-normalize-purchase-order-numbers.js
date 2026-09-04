'use strict';

/**
 * Convert legacy values such as PO-2026-0001 to the numeric format generated
 * by the procurement controllers. Existing numeric values are left unchanged.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE purchase_orders
      SET po_number = LPAD(CAST(po_id AS CHAR), 4, '0')
      WHERE po_number IS NULL OR po_number NOT REGEXP '^[0-9]+$'
    `);
  },

  async down() {
    // The former PO prefix is intentionally not restored.
  },
};
