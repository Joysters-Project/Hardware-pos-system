const db = require('./models');
const { Op } = require('sequelize');

(async () => {
  try {
    const bills = db.bills;
    const q = 'INV-2026-0001';
    const trimmed = q.trim();
    const normalizedTerm = trimmed.toLowerCase();

    const clauses = [
      bills.sequelize.where(
        bills.sequelize.fn('LOWER', bills.sequelize.col('bill_no')),
        normalizedTerm
      ),
      bills.sequelize.where(
        bills.sequelize.fn('LOWER', bills.sequelize.col('bill_no')),
        { [Op.like]: `%${normalizedTerm}%` }
      )
    ];

    const asId = parseInt(trimmed, 10);
    if (!Number.isNaN(asId)) {
      clauses.push({ bill_id: asId });
    }

    const results = await bills.findAll({
      where: { [Op.or]: clauses },
      limit: 5
    });

    console.log('count', results.length);
    console.log(results.map(r => ({ bill_id: r.bill_id, bill_no: r.bill_no })));
  } catch (e) {
    console.error('error', e);
  } finally {
    process.exit();
  }
})();
