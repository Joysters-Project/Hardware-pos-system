router.get('/search', async (req, res) => {
  const query = req.query.q;
  const results = await db.products.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { product_name: { [db.Sequelize.Op.like]: `%${query}%` } },
        { product_id: query }
      ]
    },
    limit: 5 // Keep results fast
  });
  res.json(results);
});