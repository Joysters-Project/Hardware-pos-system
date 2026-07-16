const cron = require('node-cron');

async function runNearExpiryCheck() {
  try {
    const { generateAllAlerts } = require('../services/alertService');
    await generateAllAlerts();
    console.log('[NearExpiryCron] Alert sync complete');
  } catch (error) {
    console.error('nearExpiryCron error:', error);
  }
}

const startNearExpiryCron = () => {
  // Run immediately on startup to catch existing near-expiry products
  runNearExpiryCheck();
  // Then run daily at midnight
  cron.schedule('0 0 * * *', runNearExpiryCheck, { scheduled: true, timezone: 'Asia/Kolkata' });
};

module.exports = {
  startNearExpiryCron,
};
