const db = require('./models');
const bcrypt = require('bcrypt');

async function resetCashiers() {
  try {
    const users = await db.users.findAll({ where: { role: 'Cashier' } });
    const newPassword = await bcrypt.hash('123456', 10);
    
    for (let u of users) {
      await u.update({
        password: newPassword,
        failed_attempts: 0,
        is_locked: false,
        lock_time: null,
        status: 'Active'
      });
      console.log(`Reset ${u.user_name} - Password is now 123456`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
resetCashiers();
