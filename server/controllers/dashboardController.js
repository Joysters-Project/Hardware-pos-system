const { Op } = require('sequelize');
const db = require('../models');
const PDFDocument = require('pdfkit');

exports.getCashierStats = async (req, res) => {
  try {
    const { userId } = req.query;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause = { bill_date: { $between: [startOfDay, endOfDay] } };
    if (userId && userId !== 'SYS') whereClause.user_id = userId;

    const todayBills = await db.bills.findAll({ where: whereClause });

    let todaySales = 0;
    const billIds = [];
    todayBills.forEach(bill => {
      todaySales += parseFloat(bill.total_amount) || 0;
      billIds.push(bill.bill_id);
    });

    let itemsSold = 0;
    if (billIds.length > 0) {
      const items = await db.bill_items.findAll({ where: { bill_id: { $in: billIds } } });
      items.forEach(item => { itemsSold += item.quantity; });
    }

    let returnsCount = 0;
    if (billIds.length > 0) {
      returnsCount = await db.returns.count({
        where: {
          bill_id: { $in: billIds },
          return_date: { $between: [startOfDay, endOfDay] }
        }
      });
    }

    const recentBills = await db.bills.findAll({
      where: whereClause,
      order: [['bill_date', 'DESC']],
      limit: 10,
      include: [{ model: db.customers, attributes: ['customer_name'] }]
    });

    const recentTransactions = recentBills.map(bill => {
      const date = new Date(bill.bill_date);
      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return {
        bill_id: bill.bill_id,
        customer: bill.customer ? bill.customer.customer_name : 'Walk-in',
        amount: parseFloat(bill.total_amount) || 0,
        status: bill.status || 'completed',
        time: timeStr
      };
    });

    res.json({ salesToday: todaySales, itemsSold, returnsCount, transactionsCount: todayBills.length, recentTransactions });
  } catch (error) {
    console.error('Error fetching cashier stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

exports.getAnalyticalStats = async (req, res) => {
  try {
    if (!db.bills) return res.status(503).json({ error: 'Database not ready yet, please retry.' });

    const totalAmountSum = await db.bills.sum('total_amount') || 0;
    const totalOrdersCount = await db.bills.count() || 0;
    const avgOrderValueVal = await db.bills.findOne({
      attributes: [[db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'avgAOV']]
    });
    const avgAOV = parseFloat(avgOrderValueVal ? avgOrderValueVal.getDataValue('avgAOV') : 0) || 0;
    const conversionRate = totalOrdersCount > 0 ? Math.min((totalOrdersCount / 100) * 100, 100).toFixed(2) : '0.00';

    const recentBills = await db.bills.findAll({
      attributes: ['bill_id', 'bill_date', 'total_amount', 'customer_id'],
      order: [['bill_date', 'DESC']],
      limit: 10,
      include: [{ model: db.customers, attributes: ['customer_name'] }]
    });

    const formattedTransactions = recentBills.map(bill => {
      const timeDiff = new Date() - new Date(bill.bill_date);
      const mins = Math.floor(timeDiff / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      let timeLabel = 'Just now';
      if (days > 0) timeLabel = `${days} day${days > 1 ? 's' : ''} ago`;
      else if (hours > 0) timeLabel = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      else if (mins > 0) timeLabel = `${mins} min${mins > 1 ? 's' : ''} ago`;
      return {
        id: `TXN-${bill.bill_id}`,
        customer: bill.customer ? bill.customer.customer_name : 'Walk-in Customer',
        amount: parseFloat(bill.total_amount) || 0,
        status: bill.status ? bill.status.toLowerCase() : 'completed',
        time: timeLabel
      };
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayBillsList = await db.bills.findAll({
      attributes: ['bill_id', 'bill_date', 'total_amount'],
      where: { bill_date: { $gte: startOfToday } },
      order: [['bill_date', 'ASC']]
    });

    const hourMap = {};
    for (let h = 9; h <= 21; h += 2) {
      hourMap[h] = { name: `${String(h).padStart(2, '0')}:00`, sales: 0, revenue: 0 };
    }
    todayBillsList.forEach(bill => {
      const hour = new Date(bill.bill_date).getHours();
      const blockHour = Math.max(9, Math.min(21, Math.floor(hour / 2) * 2 + 1));
      if (hourMap[blockHour]) {
        hourMap[blockHour].sales += 1;
        hourMap[blockHour].revenue += parseFloat(bill.total_amount) || 0;
      }
    });
    const dailyPoints = Object.values(hourMap);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), dateStr: d.toISOString().split('T')[0], sales: 0, revenue: 0 });
    }
    const startOf7Days = new Date();
    startOf7Days.setDate(startOf7Days.getDate() - 6);
    startOf7Days.setHours(0, 0, 0, 0);
    const weeklyBills = await db.bills.findAll({
      attributes: ['bill_id', 'bill_date', 'total_amount'],
      where: { bill_date: { $gte: startOf7Days } }
    });
    weeklyBills.forEach(bill => {
      const match = last7Days.find(pt => pt.dateStr === new Date(bill.bill_date).toISOString().split('T')[0]);
      if (match) { match.sales += 1; match.revenue += parseFloat(bill.total_amount) || 0; }
    });
    const weeklyPoints = last7Days.map(pt => ({ name: pt.label, sales: pt.sales, revenue: pt.revenue }));

    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), monthIndex: d.getMonth(), year: d.getFullYear(), sales: 0, revenue: 0 });
    }
    const startOf6Months = new Date();
    startOf6Months.setMonth(startOf6Months.getMonth() - 5);
    startOf6Months.setDate(1);
    startOf6Months.setHours(0, 0, 0, 0);
    const monthlyBills = await db.bills.findAll({
      attributes: ['bill_id', 'bill_date', 'total_amount'],
      where: { bill_date: { $gte: startOf6Months } }
    });
    monthlyBills.forEach(bill => {
      const d = new Date(bill.bill_date);
      const match = last6Months.find(pt => pt.monthIndex === d.getMonth() && pt.year === d.getFullYear());
      if (match) { match.sales += 1; match.revenue += parseFloat(bill.total_amount) || 0; }
    });
    const monthlyPoints = last6Months.map(pt => ({ name: pt.label, sales: pt.sales, revenue: pt.revenue }));

    const mapToEfficiency = (pts) => pts.map((pt, idx) => ({
      name: pt.name,
      conversion: parseFloat((3.5 + (idx % 3) * 0.3).toFixed(2)),
      aov: parseFloat(pt.sales > 0 ? (pt.revenue / pt.sales).toFixed(2) : '0.00')
    }));

    const categorySales = await db.sequelize.query(`
      SELECT c.category_name, SUM(bi.quantity) as totalSales
      FROM bill_items bi
      JOIN products p ON bi.product_id = p.product_id
      JOIN category c ON p.category_id = c.category_id
      GROUP BY c.category_id, c.category_name
    `, { type: db.Sequelize.QueryTypes.SELECT });

    let formattedCategories = categorySales.map(item => ({ name: item.category_name, sales: parseInt(item.totalSales) || 0 }));
    if (formattedCategories.length === 0) formattedCategories = [{ name: 'General', sales: 10 }];

    res.json({
      kpis: {
        totalRevenue: `LKR ${totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        salesVolume: `${totalOrdersCount} orders`,
        aov: `LKR ${avgAOV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        conversionRate: `${conversionRate}%`
      },
      recentTransactions: formattedTransactions,
      timeSeries: {
        daily:   { revenue: dailyPoints,   efficiency: mapToEfficiency(dailyPoints),   categories: formattedCategories },
        weekly:  { revenue: weeklyPoints,  efficiency: mapToEfficiency(weeklyPoints),  categories: formattedCategories },
        monthly: { revenue: monthlyPoints, efficiency: mapToEfficiency(monthlyPoints), categories: formattedCategories }
      }
    });
  } catch (error) {
    console.error('Error fetching analytical stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytical stats' });
  }
};

exports.exportAnalyticalPDF = async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Analytical_Report.pdf');
    doc.pipe(res);

    doc.fontSize(22).fillColor('#8b3a3a').text('Mathumithan Hardware POS', { align: 'center' });
    doc.fontSize(14).fillColor('#2c2c2c').text('Sales & Analytical Intelligence Report', { align: 'center' });
    doc.moveDown(2);

    const totalAmountSum = await db.bills.sum('total_amount') || 0;
    const totalOrdersCount = await db.bills.count() || 0;
    const avgOrderValueVal = await db.bills.findOne({
      attributes: [[db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'avgAOV']]
    });
    const avgAOV = parseFloat(avgOrderValueVal ? avgOrderValueVal.getDataValue('avgAOV') : 0) || 0;

    doc.fontSize(10).fillColor('#666666').text(`Report Generated On: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(14).fillColor('#8b3a3a').text('Key Performance Indicators:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#2c2c2c').text(`• Total Revenue: LKR ${totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    doc.text(`• Sales Volume: ${totalOrdersCount} orders`);
    doc.text(`• Average Order Value (AOV): LKR ${avgAOV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    doc.moveDown(2);

    doc.fontSize(14).fillColor('#8b3a3a').text('Recent Sales Ledger:', { underline: true });
    doc.moveDown(0.5);

    const recentBills = await db.bills.findAll({
      order: [['bill_date', 'DESC']],
      limit: 15,
      include: [{ model: db.customers, attributes: ['customer_name'] }]
    });

    if (recentBills.length === 0) {
      doc.fontSize(11).fillColor('#666666').text('No sales recorded in the database.');
    } else {
      recentBills.forEach((bill, index) => {
        const name = bill.customer ? bill.customer.customer_name : 'Walk-in Customer';
        const formattedAmount = parseFloat(bill.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.fontSize(10).fillColor('#2c2c2c').text(
          `${index + 1}. TXN-${bill.bill_id.toString().padStart(4, '0')}  |  Customer: ${name.padEnd(20, ' ')}  |  Amount: LKR ${formattedAmount.padStart(12, ' ')}  |  Status: ${bill.status.toUpperCase()}`
        );
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
