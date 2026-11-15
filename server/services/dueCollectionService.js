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

      const totalAmount = Number(bill.total_amount);
      if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        throw new Error("Invalid bill total");
      }

      const totalPaidBefore = Number(await db.payments.sum('amount_paid', {
        where: { bill_id },
        transaction: t
      }) || 0);
      if (!Number.isFinite(totalPaidBefore)) {
        throw new Error("Invalid payment history");
      }

      const currentBalance = Math.max(0, Number((totalAmount - totalPaidBefore).toFixed(2)));
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
      const totalPaidAfter = Number(await db.payments.sum('amount_paid', {
        where: { bill_id },
        transaction: t
      }) || 0);
      if (!Number.isFinite(totalPaidAfter)) {
        throw new Error("Invalid payment history");
      }

      const newBalance = Math.max(0, Number((totalAmount - totalPaidAfter).toFixed(2)));
      const newStatus = (newBalance <= 0) ? 'PAID' : 'PARTIAL';

      const updateData = {
        balance_due: newBalance,
        status: newStatus
      };

      if (newStatus === 'PAID') {
        updateData.expected_payment_date = null;
      } else if (paymentData.expected_payment_date) {
        updateData.expected_payment_date = paymentData.expected_payment_date;
      }

      await bill.update(updateData, { transaction: t });

      // Return both sets of updated contextual data
      return {
        payment,
        billStatus: newStatus,
        balanceRemaining: newBalance,
        expectedPaymentDate: updateData.expected_payment_date !== undefined ? updateData.expected_payment_date : bill.expected_payment_date
      };
    });
  }
}

module.exports = new DueCollectionService();
