require('dotenv').config({ quiet: true });
const db = require('./models');

db.sequelize.authenticate().then(async () => {

  // Test departments
  try {
    await db.departments.findAll({
      include: [
        { model: db.employees, attributes: ['employee_id'] },
        { model: db.assets, attributes: ['asset_id', 'cost', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });
    console.log('departments: OK');
  } catch(e) { console.error('departments ERROR:', e.message); }

  // Test products
  try {
    await db.products.findAll({
      attributes: { exclude: ['repair_quantity'] },
      include: [
        { model: db.category },
        { model: db.brands },
        { model: db.units }
      ]
    });
    console.log('products: OK');
  } catch(e) { console.error('products ERROR:', e.message); }

  // Test bills
  try {
    await db.bills.findAll({
      include: [
        { model: db.customers },
        { model: db.bill_items, include: [{ model: db.products }] },
        { model: db.payments }
      ]
    });
    console.log('bills: OK');
  } catch(e) { console.error('bills ERROR:', e.message); }

  // Test purchase-orders
  try {
    const { fn, col, Op, literal } = require('sequelize');
    await db.purchase_orders.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('po_date'), '%Y-%m'), 'month'],
        [fn('SUM', col('total_amount')), 'total'],
        [fn('COUNT', col('po_id')), 'count'],
      ],
      where: {
        po_date: { [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 6 MONTH)') },
        status: { [Op.ne]: 'Cancelled' }
      },
      group: [fn('DATE_FORMAT', col('po_date'), '%Y-%m')],
      raw: true,
    });
    console.log('purchase_orders (dashboard query): OK');
  } catch(e) { console.error('purchase_orders ERROR:', e.message); }

  // Test forecast service
  try {
    const svc = require('./services/forecastService');
    await svc.calculateForecasts();
    console.log('forecast: OK');
  } catch(e) { console.error('forecast ERROR:', e.message); }

  // Test RR_supplier getAllSuppliers
  try {
    const { fn, col } = require('sequelize');
    await db.suppliers.findAll({
      order: [['supplier_name', 'ASC']],
      attributes: {
        include: [[fn('COUNT', col('purchase_orders.po_id')), 'po_count']],
      },
      include: [{ model: db.purchase_orders, attributes: [] }],
      group: ['suppliers.supplier_id'],
    });
    console.log('suppliers (procurement): OK');
  } catch(e) { console.error('suppliers (procurement) ERROR:', e.message); }

  // Test payments
  try {
    await db.supplier_payments.findAll({
      include: [
        { model: db.suppliers, attributes: ['supplier_name', 'supplier_code'] },
        { model: db.purchase_orders, attributes: ['po_number'] }
      ],
      order: [['due_date', 'ASC']]
    });
    console.log('supplier_payments: OK');
  } catch(e) { console.error('supplier_payments ERROR:', e.message); }

  db.sequelize.close();
}).catch(e => { console.error('DB connect ERROR:', e.message); db.sequelize.close(); });
