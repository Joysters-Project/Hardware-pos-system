// server/seeders/20230910-insert-test-invoice.js
const db = require('../models');

module.exports = {
  up: async () => {
    // Ensure default category exists
    const [defaultCategory] = await db.category.findOrCreate({
      where: { category_name: 'General' },
      defaults: { category_name: 'General' }
    });

    // Ensure default unit exists
    const [defaultUnit] = await db.units.findOrCreate({
      where: { unit_name: 'Pcs' },
      defaults: { unit_name: 'Pcs' }
    });

    // Ensure product "river sand" exists
    const [riverSand] = await db.products.findOrCreate({
      where: { product_name: 'river sand' },
      defaults: {
        product_name: 'river sand',
        unit_price: 100.00,
        cost_price: 80.00,
        stock_quantity: 50.00,
        min_stock_quantity: 1.00,
        reorder_level: 5.00,
        type: 'material',
        category_id: defaultCategory.category_id,
        unit_id: defaultUnit.unit_id,
        status: 'active'
      }
    });

    // Ensure product "generic product" exists
    const [genericProduct] = await db.products.findOrCreate({
      where: { product_name: 'generic product' },
      defaults: {
        product_name: 'generic product',
        unit_price: 50.00,
        cost_price: 40.00,
        stock_quantity: 50.00,
        min_stock_quantity: 1.00,
        reorder_level: 5.00,
        type: 'material',
        category_id: defaultCategory.category_id,
        unit_id: defaultUnit.unit_id,
        status: 'active'
      }
    });

    // Find customer 'bala' if exists
    const customer = await db.customers.findOne({
      where: { phone_no: { [db.Sequelize.Op.like]: '%0771234567%' } }
    });
    const customerId = customer ? customer.customer_id : null;

    // Create or find test invoice (bill)
    let bill = await db.bills.findOne({ where: { bill_no: 'INV-2026-0001' } });
    if (!bill) {
      bill = await db.bills.create({
        bill_no: 'INV-2026-0001',
        bill_date: new Date(),
        subtotal: 1000.00,
        discount: 0.00,
        total_amount: 1000.00,
        balance_due: 0.00,
        status: 'PAID',
        user_id: 1,
        customer_id: customerId
      });
    } else {
      await bill.update({
        bill_date: new Date(),
        subtotal: 1000.00,
        discount: 0.00,
        total_amount: 1000.00,
        balance_due: 0.00,
        status: 'PAID',
        customer_id: customerId
      });
    }

    // Clean any prior returns for this bill
    const existingReturns = await db.returns.findAll({ where: { bill_id: bill.bill_id } });
    if (existingReturns.length > 0) {
      const returnIds = existingReturns.map(r => r.return_id);
      await db.return_items.destroy({ where: { return_id: { [db.Sequelize.Op.in]: returnIds } } });
      await db.returns.destroy({ where: { return_id: { [db.Sequelize.Op.in]: returnIds } } });
    }

    // Insert / reset bill items for INV-2026-0001
    await db.bill_items.destroy({ where: { bill_id: bill.bill_id } });
    await db.bill_items.bulkCreate([
      {
        bill_id: bill.bill_id,
        product_id: riverSand.product_id,
        quantity: 5.00,
        billed_quantity: 5.00,
        billed_unit_id: defaultUnit.unit_id,
        price_per_unit: 100.00,
        discount: 0.00,
        total_price: 500.00
      },
      {
        bill_id: bill.bill_id,
        product_id: genericProduct.product_id,
        quantity: 10.00,
        billed_quantity: 10.00,
        billed_unit_id: defaultUnit.unit_id,
        price_per_unit: 50.00,
        discount: 0.00,
        total_price: 500.00
      }
    ]);

    // Ensure payment record exists
    const [payment] = await db.payments.findOrCreate({
      where: { bill_id: bill.bill_id },
      defaults: {
        bill_id: bill.bill_id,
        payment_date: new Date(),
        amount_paid: 1000.00,
        payment_method: 'CASH',
        user_id: 1
      }
    });

    console.log('[Seeder] Test invoice INV-2026-0001 seeded successfully with 2 bill_items.');
  },

  down: async () => {
    const bill = await db.bills.findOne({ where: { bill_no: 'INV-2026-0001' } });
    if (bill) {
      const existingReturns = await db.returns.findAll({ where: { bill_id: bill.bill_id } });
      if (existingReturns.length > 0) {
        const returnIds = existingReturns.map(r => r.return_id);
        await db.return_items.destroy({ where: { return_id: { [db.Sequelize.Op.in]: returnIds } } });
        await db.returns.destroy({ where: { return_id: { [db.Sequelize.Op.in]: returnIds } } });
      }
      await db.payments.destroy({ where: { bill_id: bill.bill_id } });
      await db.bill_items.destroy({ where: { bill_id: bill.bill_id } });
      await bill.destroy();
    }
    console.log('[Seeder] Test invoice INV-2026-0001 cleaned up.');
  }
};
