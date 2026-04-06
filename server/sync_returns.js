const db = require('./models');

const syncReturns = async () => {
    try {
        console.log('Syncing returns table...');
        await db.returns.sync({ alter: true });
        console.log('✅ Returns table synchronized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to synchronize returns table:', err);
        process.exit(1);
    }
};

syncReturns();
