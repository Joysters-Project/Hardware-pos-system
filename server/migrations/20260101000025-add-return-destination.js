'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('returns', 'destination', {
        type: Sequelize.ENUM('STOCK', 'REPAIR', 'SUPPLIER', 'WRITEOFF'),
        allowNull: false,
        defaultValue: 'STOCK'
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column destination already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.addColumn('returns', 'destination_note', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column destination_note already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.addColumn('returns', 'processed_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column processed_by already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.addColumn('products', 'repair_quantity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column repair_quantity already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.createTable('supplier_returns', {
        sr_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        return_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'returns',
            key: 'return_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'suppliers',
            key: 'supplier_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'product_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        reason: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'SENT', 'CREDITED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    } catch (err) {
      if (err.message && err.message.includes('Table') && err.message.includes('already exists')) {
        console.log('Table supplier_returns already exists, skipping...');
      } else {
        throw err;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('supplier_returns');
    } catch (err) {
      console.log('Table supplier_returns does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('returns', 'processed_by');
    } catch (err) {
      console.log('Column processed_by does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('returns', 'destination_note');
    } catch (err) {
      console.log('Column destination_note does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('returns', 'destination');
    } catch (err) {
      console.log('Column destination does not exist, skipping...');
    }

    try {
      await queryInterface.removeColumn('products', 'repair_quantity');
    } catch (err) {
      console.log('Column repair_quantity does not exist, skipping...');
    }
  }
};
