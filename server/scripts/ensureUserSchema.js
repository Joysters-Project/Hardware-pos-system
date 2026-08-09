const db = require('../models');
const { DataTypes } = require('sequelize');

async function ensureUserSchema() {
  try {
    const qi = db.sequelize.getQueryInterface();
    const desc = await qi.describeTable('users').catch(() => null);
    if (!desc) return;

    const addIfMissing = async (col, def) => {
      if (!desc[col]) {
        await qi.addColumn('users', col, def);
        console.log(`✅ Added missing column: users.${col}`);
      }
    };

    await addIfMissing('first_name',  { type: DataTypes.STRING(50),  allowNull: true });
    await addIfMissing('last_name',   { type: DataTypes.STRING(50),  allowNull: true });
    await addIfMissing('failed_attempts',    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
    await addIfMissing('is_locked',          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await addIfMissing('lock_time',          { type: DataTypes.DATE,    allowNull: true });
    await addIfMissing('reset_token',        { type: DataTypes.STRING(255), allowNull: true, defaultValue: null });
    await addIfMissing('reset_token_expiry', { type: DataTypes.DATE,        allowNull: true, defaultValue: null });

    console.log('✅ Users schema verified/updated successfully.');
  } catch (error) {
    console.error('⚠️ Users schema verification failed:', error.message);
  }
}

module.exports = ensureUserSchema;
