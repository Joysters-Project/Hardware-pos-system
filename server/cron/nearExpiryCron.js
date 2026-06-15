const cron = require('node-cron');
const { Op } = require('sequelize');
const { products, alerts } = require('../models');

const startNearExpiryCron = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringProducts = await products.findAll({
          where: {
            status: 'active',
            expiry_date: {
              [Op.between]: [now, thirtyDaysFromNow],
            },
          },
        });

        for (const product of expiringProducts) {
          await alerts.findOrCreate({
            where: {
              product_id: product.product_id,
              alert_type: 'Near Expiry',
              is_resolved: false,
            },
            defaults: {
              product_id: product.product_id,
              alert_type: 'Near Expiry',
              is_resolved: false,
              resolved_date: null,
            },
          });
        }
      } catch (error) {
        console.error('nearExpiryCron error:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    }
  );
};

module.exports = {
  startNearExpiryCron,
};
