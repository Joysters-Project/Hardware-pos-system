const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  return sequelize.define('users', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(50), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    employee_id: { type: DataTypes.INTEGER, unique: true },
    failed_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
    lock_time: { type: DataTypes.DATE, allowNull: true },
    // Password reset — no unique index (avoids MySQL "Too many keys" on alter)
    reset_token: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    reset_token_expiry: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password && !user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          // Only hash if it's NOT already a bcrypt hash
          if (!user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
    }
  });
};