const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();
    const users = await db.users.findAll({
      attributes: ['user_id','user_name','role','status','employee_id','failed_attempts','is_locked','password'],
      raw: true,
    });
    console.log('USER_COUNT=' + users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
