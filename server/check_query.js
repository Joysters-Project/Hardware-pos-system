const db = require('./models');

// Test if the query builds correctly without database connection
try {
  console.log("Testing Sequelize query build...");
  const sql = db.users.findOne({ 
    where: { user_name: 'test' },
    include: [{model: db.employees, attributes: ['department_id']}],
    logging: console.log
  });
  console.log("Query building test passed!");
} catch (error) {
  console.error("Query building failed:", error.message);
}

process.exit(0);
