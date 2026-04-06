const { returns, products, payments, sequelize } = require('../models');

// PROCESS Return complex logic
exports.processReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { bill_id, product_id, return_quantity, refund_amount, destination, reason, po_id, supplier_id } = req.body;
    
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

    await payments.create({
      bill_id,
      amount_paid: -Math.abs(refund_amount), 
      payment_method: 'CASH'
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ message: "Return processed successfully", data: newReturn });
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