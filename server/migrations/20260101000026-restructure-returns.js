'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Drop the existing supplier_returns table first because it depends on returns
    await queryInterface.dropTable('supplier_returns');

    // 2. Drop the existing returns table
    await queryInterface.dropTable('returns');

    // 3. Create the new `returns` table (Header)
    await queryInterface.createTable('returns', {
      return_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bills', key: 'bill_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      return_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      total_refund_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      processed_by: {
        type: Sequelize.INTEGER,
        allowNull: true, // Some existing returns might not have processed_by
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'COMPLETED'
      },
      po_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    });

    // 4. Create the `return_items` table (Line Items)
    await queryInterface.createTable('return_items', {
      return_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      return_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'returns', key: 'return_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'product_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      return_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: { min: 1 }
      },
      refund_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      return_reason: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      destination: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'STOCK'
      },
      destination_note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      exchange_product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'products', key: 'product_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });

    // 5. Recreate supplier_returns to depend on the new returns header
    await queryInterface.createTable('supplier_returns', {
      supplier_return_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      return_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'returns', key: 'return_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'suppliers', key: 'supplier_id' }
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'product_id' }
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // The down method is difficult because we lose data when dropping. 
    // We'll just drop the new tables.
    await queryInterface.dropTable('supplier_returns');
    await queryInterface.dropTable('return_items');
    await queryInterface.dropTable('returns');
  }
};
