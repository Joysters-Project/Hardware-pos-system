const db = require('./models');
const fs = require('fs');

async function checkUsers() {
  try {
    const users = await db.users.findAll();
    const result = users.map(u => ({
      user_name: u.user_name,
      role: u.role,
      status: u.status,
      is_locked: u.is_locked,
      failed_attempts: u.failed_attempts,
      has_password: !!u.password
    }));
    fs.writeFileSync('users_output.json', JSON.stringify(result, null, 2));
    console.log("Written to users_output.json");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkUsers();
