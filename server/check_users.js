const db = require('./models');

async function run() {
  try {
    const users = await db.users.findAll({
      // include: [{model: db.employees}]
    });
    console.log("USERS:");
    console.log(JSON.stringify(users, null, 2));
    
    if (users.length > 0) {
      console.log('Comparing password for first user...');
      const bcrypt = require('bcrypt');
      // If we know a password, we can compare it here, e.g., '123'
      const match = await bcrypt.compare('123', users[0].password);
      console.log('Password 123 matches:', match);
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
