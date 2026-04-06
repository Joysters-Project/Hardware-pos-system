const db = require('../models');
const { Op } = require('sequelize');

exports.getCashierStats = async (req, res) => {
  try {
    const { userId } = req.query; 

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = {
      [Op.between]: [startOfDay, endOfDay]
    };

    // If userId exists, filter by it, else just today's globally (fallback)
    const whereClause = { bill_date: dateFilter };
    if (userId && userId !== 'SYS') {
       whereClause.user_id = userId;
    }

    const todayBills = await db.bills.findAll({
      where: whereClause
    });

    let todaySales = 0;
    const billIds = [];

    todayBills.forEach(bill => {
      todaySales += parseFloat(bill.total_amount) || 0;
      billIds.push(bill.bill_id);
    });

    let itemsSold = 0;
    if (billIds.length > 0) {
      const items = await db.bill_items.findAll({
        where: {
          bill_id: { [Op.in]: billIds }
        }
      });
      items.forEach(item => {
        itemsSold += item.quantity;
      });
    }

    let returnsCount = 0;
    if (billIds.length > 0) {
      returnsCount = await db.returns.count({
        where: {
          bill_id: { [Op.in]: billIds },
          return_date: dateFilter
        }
      });
    }

    res.json({
      salesToday: todaySales,
      itemsSold: itemsSold,
      returnsCount: returnsCount,
      transactionsCount: todayBills.length
    });

  } catch (error) {
    console.error('Error fetching cashier stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
