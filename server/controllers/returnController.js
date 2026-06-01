const { returns, products, payments, bills, bill_items, sequelize } = require('../models');

// PROCESS Return complex logic
exports.processReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      bill_id,
      product_id,
      return_quantity,
      refund_amount,
      destination,
      reason,
      po_id,
      supplier_id
    } = req.body;

    if (!bill_id || !product_id || !return_quantity || refund_amount == null) {
      throw new Error('bill_id, product_id, return_quantity and refund_amount are required');
    }

    const bill = await bills.findByPk(bill_id, { transaction });
    if (!bill) {
      throw new Error('Bill not found');
    }

    const billItem = await bill_items.findOne({
      where: { bill_id, product_id },
      transaction
    });

    if (!billItem) {
      throw new Error('This product is not part of the selected bill');
    }

    if (return_quantity > billItem.quantity) {
      throw new Error('Return quantity exceeds quantity sold in the bill');
    }

    const pricePerUnit = parseFloat(billItem.price_per_unit);
    const currentQty = billItem.quantity;
    const lineDiscount = parseFloat(billItem.discount || 0);
    const perUnitDiscount = currentQty > 0 ? lineDiscount / currentQty : 0;
    const remainingQty = currentQty - return_quantity;
    const remainingDiscount = perUnitDiscount * remainingQty;
    const remainingTotal = Math.max(0, remainingQty * pricePerUnit - remainingDiscount);

    if (remainingQty <= 0) {
      await billItem.destroy({ transaction });
    } else {
      await billItem.update(
        {
          quantity: remainingQty,
          discount: remainingDiscount,
          total_price: remainingTotal
        },
        { transaction }
      );
    }

    const returnData = {
      bill_id,
      product_id,
      return_quantity,
      refund_amount,
      destination: destination || 'STOCK',
      reason,
      po_id,
      supplier_id
    };

    if (destination === 'SUPPLIER') {
      returnData.status = 'PENDING_APPROVAL';
      returnData.debit_note_raised = true;
    } else {
      returnData.status = 'COMPLETED';
    }

    const newReturn = await returns.create(returnData, { transaction });

    if (destination === 'STOCK') {
      const product = await products.findByPk(product_id, { transaction });
      if (product) {
        await product.increment('stock_quantity', { by: return_quantity, transaction });
      }
    }

    await payments.create(
      {
        bill_id,
        amount_paid: -Math.abs(refund_amount),
        payment_method: destination === 'SUPPLIER' ? 'SUPPLIER_RETURN' : 'REFUND'
      },
      { transaction }
    );

    const paymentSum = await payments.sum('amount_paid', {
      where: { bill_id },
      transaction
    }) || 0;

    const newTotalAmount = Math.max(0, parseFloat(bill.total_amount) - parseFloat(refund_amount));
    const newSubtotal = Math.max(0, parseFloat(bill.subtotal) - parseFloat(refund_amount));
    let newBalanceDue = newTotalAmount - paymentSum;
    if (Number.isNaN(newBalanceDue)) newBalanceDue = 0;
    if (newBalanceDue < 0) newBalanceDue = 0;

    const updatedStatus = newBalanceDue > 0 ? 'PARTIAL' : 'PAID';

    await bill.update(
      {
        subtotal: newSubtotal,
        total_amount: newTotalAmount,
        balance_due: newBalanceDue,
        status: updatedStatus
      },
      { transaction }
    );

    await transaction.commit();

    const updatedBill = await bills.findByPk(bill_id, {
      include: [
        {
          model: bill_items,
          include: [products]
        }
      ]
    });

    res.status(201).json({
      message: "Return processed successfully",
      data: newReturn,
      bill: updatedBill
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// CREATE Return
exports.createReturn = async (req, res) => {
  try {
    const newReturn = await returns.create(req.body);

    res.status(201).json({
      message: "Return created successfully",
      data: newReturn
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Returns
exports.getAllReturns = async (req, res) => {
  try {
    const returnList = await returns.findAll();

    res.status(200).json(returnList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Return by ID
exports.getReturnById = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    res.status(200).json(returnItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Return
exports.updateReturn = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    await returnItem.update(req.body);

    res.status(200).json({
      message: "Return updated successfully",
      data: returnItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Return
exports.deleteReturn = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    await returnItem.destroy();

    res.status(200).json({
      message: "Return deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};