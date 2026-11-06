'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // 1. Normalize empty/whitespace barcodes to NULL in products and product_units
    await sequelize.query(`
      UPDATE products 
      SET barcode = NULL 
      WHERE barcode IS NOT NULL AND TRIM(barcode) = ''
    `);

    await sequelize.query(`
      UPDATE product_units 
      SET barcode = NULL 
      WHERE barcode IS NOT NULL AND TRIM(barcode) = ''
    `);

    // 2. Check and handle any duplicates in products before applying unique index
    const [prodDupes] = await sequelize.query(`
      SELECT barcode, COUNT(*) as cnt 
      FROM products 
      WHERE barcode IS NOT NULL 
      GROUP BY barcode 
      HAVING cnt > 1
    `);

    for (const dup of prodDupes) {
      console.warn(`⚠️ Duplicate barcode detected in products: "${dup.barcode}". Retaining primary product and nullifying duplicates.`);
      const [rows] = await sequelize.query(`
        SELECT product_id FROM products 
        WHERE barcode = :barcode 
        ORDER BY product_id ASC
      `, { replacements: { barcode: dup.barcode } });

      // Keep the first, set others to NULL
      const duplicateIds = rows.slice(1).map(r => r.product_id);
      if (duplicateIds.length > 0) {
        await sequelize.query(`
          UPDATE products 
          SET barcode = NULL 
          WHERE product_id IN (:ids)
        `, { replacements: { ids: duplicateIds } });
      }
    }

    // 3. Check and handle any duplicates in product_units before applying unique index
    const [unitDupes] = await sequelize.query(`
      SELECT barcode, COUNT(*) as cnt 
      FROM product_units 
      WHERE barcode IS NOT NULL 
      GROUP BY barcode 
      HAVING cnt > 1
    `);

    for (const dup of unitDupes) {
      console.warn(`⚠️ Duplicate barcode detected in product_units: "${dup.barcode}". Retaining first unit and nullifying duplicates.`);
      const [rows] = await sequelize.query(`
        SELECT product_unit_id FROM product_units 
        WHERE barcode = :barcode 
        ORDER BY product_unit_id ASC
      `, { replacements: { barcode: dup.barcode } });

      const duplicateIds = rows.slice(1).map(r => r.product_unit_id);
      if (duplicateIds.length > 0) {
        await sequelize.query(`
          UPDATE product_units 
          SET barcode = NULL 
          WHERE product_unit_id IN (:ids)
        `, { replacements: { ids: duplicateIds } });
      }
    }

    // 4. Add unique index to products.barcode if not existing
    try {
      const [indexes] = await sequelize.query(`SHOW INDEX FROM products WHERE Key_name = 'idx_products_barcode_unique'`);
      if (indexes.length === 0) {
        await queryInterface.addIndex('products', ['barcode'], {
          name: 'idx_products_barcode_unique',
          unique: true
        });
        console.log('✅ Added unique index idx_products_barcode_unique to products table.');
      } else {
        console.log('Index idx_products_barcode_unique already exists, skipping.');
      }
    } catch (err) {
      console.warn('Could not add index idx_products_barcode_unique:', err.message);
    }

    // 5. Add unique index to product_units.barcode if not existing
    try {
      const [indexes] = await sequelize.query(`SHOW INDEX FROM product_units WHERE Key_name = 'idx_product_units_barcode_unique'`);
      if (indexes.length === 0) {
        await queryInterface.addIndex('product_units', ['barcode'], {
          name: 'idx_product_units_barcode_unique',
          unique: true
        });
        console.log('✅ Added unique index idx_product_units_barcode_unique to product_units table.');
      } else {
        console.log('Index idx_product_units_barcode_unique already exists, skipping.');
      }
    } catch (err) {
      console.warn('Could not add index idx_product_units_barcode_unique:', err.message);
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('products', 'idx_products_barcode_unique');
    } catch (err) {
      console.warn('Could not remove idx_products_barcode_unique:', err.message);
    }

    try {
      await queryInterface.removeIndex('product_units', 'idx_product_units_barcode_unique');
    } catch (err) {
      console.warn('Could not remove idx_product_units_barcode_unique:', err.message);
    }
  }
};

