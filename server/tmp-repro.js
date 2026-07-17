const db = require('./models');

(async () => {
  try {
    const result = await db.bill_items.findAll({
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalSales']],
      include: [{
        model: db.products,
        attributes: ['product_id'],
        include: [{
          model: db.category,
          attributes: ['category_name']
        }]
      }],
      group: ['product.category.category_id']
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERR', e.message);
    console.error(e.stack);
  } finally {
    await db.sequelize.close();
  }
})();
