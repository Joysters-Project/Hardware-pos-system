const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bills = sequelize.define('bills', {
    bill_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    bill_no: { 
      type: DataTypes.STRING(50), 
      allowNull: false, 
      unique: true 
    },
    bill_date: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
    // Matches Data Dictionary: Total before discount
    subtotal: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      defaultValue: 0.00
    },
    // Stores the manual discount override from the cashier
    discount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00 
    },
    // Increased precision to (15,2) to match subtotal for large hardware orders
    total_amount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      defaultValue: 0.00
    },
    // Balance due for partial payments
    balance_due: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00 
    },
    // Bill status (PAID, PARTIAL, etc.)
    status: { 
      type: DataTypes.STRING(20), 
      allowNull: false, 
      defaultValue: 'PAID' 
    },
    // Foreign Keys (Ensure these match your User and Customer table PKs)
    user_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { model: 'users', key: 'user_id' }
    },
    customer_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      references: { model: 'customers', key: 'customer_id' }
    }
  }, { 
    tableName: 'bills', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Bills;
};