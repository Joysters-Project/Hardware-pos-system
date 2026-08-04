const db = require('../models');

module.exports = async function ensureChequeExchangeSchema() {
  const qi = db.sequelize.getQueryInterface();

  // ── cheque_customers ──────────────────────────────────────────────────────
  try {
    await qi.createTable('cheque_customers', {
      customer_id:   { type: 'INT', primaryKey: true, autoIncrement: true },
      customer_name: { type: 'VARCHAR(150)', allowNull: false },
      nic_number:    { type: 'VARCHAR(20)',  allowNull: false },
      phone_number:  { type: 'VARCHAR(20)',  allowNull: false },
      address:       { type: 'TEXT',         allowNull: false },
      created_at:    { type: 'DATETIME',     allowNull: false, defaultValue: db.sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:    { type: 'DATETIME',     allowNull: false, defaultValue: db.sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { ifNotExists: true });

    // Unique index on nic_number
    const [rows] = await db.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cheque_customers' AND INDEX_NAME = 'cheque_customers_nic_unique'`
    );
    if (!rows[0].cnt) {
      await db.sequelize.query(
        `ALTER TABLE cheque_customers ADD UNIQUE INDEX cheque_customers_nic_unique (nic_number)`
      );
    }
    console.log('[ChequeExchange] cheque_customers table ready');
  } catch (e) {
    console.warn('[ChequeExchange] cheque_customers setup warning:', e.message);
  }

  // ── customer_cheques ──────────────────────────────────────────────────────
  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS customer_cheques (
        cheque_id               INT AUTO_INCREMENT PRIMARY KEY,
        customer_id             INT NOT NULL,
        cheque_number           VARCHAR(100) NOT NULL,
        bank_name               VARCHAR(100) NOT NULL,
        account_holder_name     VARCHAR(150) NOT NULL,
        cheque_date             DATE NOT NULL,
        expected_clearance_date DATE NOT NULL,
        cheque_amount           DECIMAL(15,2) NOT NULL,
        discount_percentage     DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
        service_charge          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_paid_to_customer DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        cheque_status           ENUM('Pending','Cleared','Bounced','Cancelled') NOT NULL DEFAULT 'Pending',
        received_date           DATE NOT NULL,
        deposited_date          DATE NULL,
        cleared_date            DATE NULL,
        repayment_required      TINYINT(1) NOT NULL DEFAULT 0,
        repayment_amount        DECIMAL(15,2) NULL,
        repayment_status        ENUM('Pending','Paid','Not Required') NOT NULL DEFAULT 'Not Required',
        remarks                 TEXT NULL,
        created_by              INT NULL,
        updated_by              INT NULL,
        created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES cheque_customers(customer_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[ChequeExchange] customer_cheques table ready');
  } catch (e) {
    console.warn('[ChequeExchange] customer_cheques setup warning:', e.message);
  }
};
