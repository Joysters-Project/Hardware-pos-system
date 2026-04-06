const db = require('./models');

async function checkUsers() {
  try {
    const users = await db.users.findAll();
    console.log(`Found ${users.length} users in total.\n`);
    
    for (let u of users) {
      console.log(`Username: ${u.user_name} | Role: ${u.role} | Status: ${u.status} | Locked: ${u.is_locked} | Att: ${u.failed_attempts}`);
      console.log(`Password Hash: ${u.password.substring(0, 15)}...`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkUsers();
