const db = require('./models');
const bcrypt = require('bcrypt');

async function repairPasswords() {
  try {
    const users = await db.users.findAll();
    console.log(`Found ${users.length} users.`);
    
    let updatedCount = 0;
    
    for (let user of users) {
      console.log(`\nChecking user: ${user.user_name}`);
      console.log(`Current DB password: ${user.password}`);
      
      // A bcrypt hash usually starts with $2b$ or $2a$ and is 60 chars long.
      if (!user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
        console.log(`Password for '${user.user_name}' is NOT hashed. Hashing it now...`);
        
        // Assume the plain text password is what's currently in the DB
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Reset failed attempts so they can log in
        await user.update({ 
          password: hashedPassword,
          failed_attempts: 0,
          is_locked: false,
          lock_time: null
        });
        
        console.log(`Password for '${user.user_name}' successfully hashed and account unlocked.`);
        updatedCount++;
      } else {
        console.log(`Password for '${user.user_name}' is already a valid bcrypt hash.`);
        
        if (user.failed_attempts >= 3 || user.is_locked) {
           console.log(`Unlocking account and resetting failed attempts for '${user.user_name}'...`);
           await user.update({ 
             failed_attempts: 0,
             is_locked: false,
             lock_time: null
           });
        }
      }
    }
    
    console.log(`\nFinished repairing. Updated ${updatedCount} users.`);
  } catch (e) {
    console.error("Error connecting to DB or repairing passwords:", e.message);
  } finally {
    process.exit(0);
  }
}

repairPasswords();
