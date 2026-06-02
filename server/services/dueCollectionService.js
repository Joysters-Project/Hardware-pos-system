const db = require('../models');

class DueCollectionService {
  /**
   * Processes a due collection payment transaction atomically.
   * @param {Object} paymentData 
   * @param {number} userId - The ID of the cashier collecting the due
   * @returns {Object} The created payment and updated bill info
   */
  async collectPayment(paymentData, userId) {
    const { bill_id, amount_paid, payment_method } = paymentData;

    if (!bill_id || !amount_paid) {
      throw new Error("Missing required fields: bill_id, amount_paid");
    }

    const payAmount = parseFloat(amount_paid);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new Error("Invalid payment amount");
    }

    return await db.sequelize.transaction(async (t) => {
      // 1. Fetch the corresponding bill
      const bill = await db.bills.findByPk(bill_id, { transaction: t });
      if (!bill) {
        throw new Error("Bill not found");
      }

      const currentBalance = parseFloat(bill.balance_due);
      if (currentBalance <= 0) {
        throw new Error("This bill has already been fully paid.");
      }

      if (payAmount > currentBalance) {
        throw new Error(`Overpayment not allowed. Balance due is ${currentBalance}`);
      }

      // 2. Insert into payments tracking
      const payment = await db.payments.create({
        bill_id,
        amount_paid: payAmount,
        payment_method: payment_method || 'CASH',
        collected_by: userId
      }, { transaction: t });

      // 3. Update the bills state
      const newBalance = currentBalance - payAmount;
      const newStatus = (newBalance <= 0) ? 'PAID' : 'PARTIAL';

      await bill.update({
        balance_due: newBalance,
        status: newStatus
      }, { transaction: t });

      // Return both sets of updated contextual data
      return {
        payment,
        billStatus: newStatus,
        balanceRemaining: newBalance
      };
    });
  }
}

module.exports = new DueCollectionService();
