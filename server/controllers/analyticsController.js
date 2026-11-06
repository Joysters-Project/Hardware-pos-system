const { Op } = require('sequelize');
const db = require('../models');

const getRange = (from, to) => {
  const start = from ? new Date(from) : new Date('2000-01-01');
  const end   = to   ? new Date(to)   : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// 1. Top-selling products by quantity sold
exports.topProducts = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT p.product_id, p.product_name,
             SUM(bi.quantity) AS total_qty,
             SUM(bi.total_price) AS total_revenue,
             COUNT(DISTINCT bi.bill_id) AS bill_count
      FROM bill_items bi
      JOIN products p ON p.product_id = bi.product_id
      JOIN bills b ON b.bill_id = bi.bill_id
      WHERE b.bill_date BETWEEN :start AND :end
      GROUP BY p.product_id, p.product_name
      ORDER BY total_qty DESC
      LIMIT 20
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2. Cashier sales activity (exclude Admin/Manager)
exports.cashierActivity = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT u.user_id, u.first_name, u.last_name, u.role,
             COUNT(b.bill_id) AS transaction_count,
             SUM(b.total_amount) AS total_billed,
             MIN(b.bill_date) AS first_txn,
             MAX(b.bill_date) AS last_txn
      FROM bills b
      JOIN users u ON u.user_id = b.user_id
      WHERE b.bill_date BETWEEN :start AND :end
        AND LOWER(u.role) NOT IN ('admin','manager')
      GROUP BY u.user_id, u.first_name, u.last_name, u.role
      ORDER BY transaction_count DESC
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. Regular customers by purchase frequency
exports.regularCustomers = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT c.customer_id, c.customer_name, c.phone_no,
             COUNT(b.bill_id) AS visit_count,
             SUM(b.total_amount) AS total_spent,
             SUM(b.balance_due) AS total_due,
             MIN(b.bill_date) AS first_visit,
             MAX(b.bill_date) AS last_visit
      FROM bills b
      JOIN customers c ON c.customer_id = b.customer_id
      WHERE b.bill_date BETWEEN :start AND :end
      GROUP BY c.customer_id, c.customer_name, c.phone_no
      ORDER BY visit_count DESC
      LIMIT 20
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. Regular suppliers by PO count
exports.regularSuppliers = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT s.supplier_id, s.supplier_name, s.contact_person, s.phone,
             COUNT(po.po_id) AS po_count,
             SUM(po.total_amount) AS total_ordered,
             MIN(po.po_date) AS first_order,
             MAX(po.po_date) AS last_order
      FROM purchase_orders po
      JOIN suppliers s ON s.supplier_id = po.supplier_id
      WHERE po.po_date BETWEEN :start AND :end
      GROUP BY s.supplier_id, s.supplier_name, s.contact_person, s.phone
      ORDER BY po_count DESC
      LIMIT 20
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// 5. Products frequently returned to suppliers (via supplier_returns)
exports.supplierReturnedProducts = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT p.product_id, p.product_name,
             s.supplier_name,
             COUNT(sr.supplier_return_id) AS return_count,
             SUM(sr.quantity) AS total_qty,
             MAX(sr.created_at) AS last_returned,
             sr.status
      FROM supplier_returns sr
      JOIN products p ON p.product_id = sr.product_id
      JOIN suppliers s ON s.supplier_id = sr.supplier_id
      WHERE sr.created_at BETWEEN :start AND :end
      GROUP BY p.product_id, p.product_name, s.supplier_name, sr.status
      ORDER BY return_count DESC
      LIMIT 20
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// 6. Customers with outstanding borrow balances (PARTIAL bills)
exports.borrowBalances = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);
    const rows = await db.sequelize.query(`
      SELECT c.customer_id, c.customer_name, c.phone_no, c.address,
             COUNT(b.bill_id) AS partial_bill_count,
             SUM(b.balance_due) AS total_outstanding,
             SUM(b.total_amount) AS total_billed,
             MIN(b.bill_date) AS oldest_borrow,
             MAX(b.bill_date) AS latest_borrow
      FROM bills b
      JOIN customers c ON c.customer_id = b.customer_id
      WHERE b.status = 'PARTIAL'
        AND b.bill_date BETWEEN :start AND :end
      GROUP BY c.customer_id, c.customer_name, c.phone_no, c.address
      ORDER BY total_outstanding DESC
      LIMIT 20
    `, { replacements: { start, end }, type: db.Sequelize.QueryTypes.SELECT });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
