const { supplier_services, return_items, returns, products, suppliers, inventory_statuses, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllSupplierServices = async (req, res) => {
  try {
    const { status, supplier_id, search } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }
    if (supplier_id) {
      whereClause.supplier_id = supplier_id;
    }

    const includeArr = [
      {
        model: suppliers,
        attributes: ['supplier_id', 'supplier_name', 'phone', 'email']
      },
      {
        model: return_items,
        attributes: ['return_item_id', 'return_id', 'product_id', 'return_quantity', 'condition', 'action', 'return_reason'],
        include: [
          {
            model: products,
            attributes: ['product_id', 'product_name', 'unit_price', 'cost_price']
          },
          {
            model: returns,
            attributes: ['return_id', 'bill_id', 'return_date', 'customer_id', 'status']
          }
        ]
      }
    ];

    const services = await supplier_services.findAll({
      where: whereClause,
      include: includeArr,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('getAllSupplierServices error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSupplierServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await supplier_services.findById(id, {
      include: [
        { model: suppliers },
        { 
          model: return_items,
          include: [{ model: products }, { model: returns }]
        }
      ]
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Supplier service record not found' });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSupplierService = async (req, res) => {
  try {
    const { return_item_id, supplier_id, service_type, repair_cost, discount_percentage, customer_payment } = req.body;

    if (!return_item_id || !supplier_id) {
      return res.status(400).json({ success: false, error: 'return_item_id and supplier_id are required' });
    }

    const cost = parseFloat(repair_cost) || 0;
    const discount = parseFloat(discount_percentage) || 0;
    const calcPayment = customer_payment !== undefined 
      ? parseFloat(customer_payment) 
      : Math.max(0, cost - (cost * (discount / 100)));

    const newService = await supplier_services.create({
      return_item_id,
      supplier_id,
      service_type: service_type || 'REPAIR',
      repair_cost: cost,
      discount_percentage: discount,
      customer_payment: calcPayment,
      status: 'PENDING'
    });

    res.status(201).json({ success: true, data: newService });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateSupplierServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, return_to_stock } = req.body;

    if (!status || !['PENDING', 'SENT', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status required: PENDING, SENT, or COMPLETED' });
    }

    const result = await sequelize.transaction(async (t) => {
      const service = await supplier_services.findById(id, {
        include: [{ model: return_items }],
        transaction: t
      });

      if (!service) {
        throw new Error('Supplier service record not found');
      }

      const prevStatus = service.status;
      await service.update({ status }, { transaction: t });

      // Handle stock completion updates when status transitions to COMPLETED
      if (status === 'COMPLETED' && prevStatus !== 'COMPLETED' && service.return_item) {
        const productId = service.return_item.product_id;
        const qty = service.return_item.return_quantity || 1;

        const [invStatus] = await inventory_statuses.findOrCreate({
          where: { product_id: productId },
          defaults: { product_id: productId, available_qty: 0, repair_qty: 0, damaged_qty: 0 },
          transaction: t
        });

        // Reduce repair_qty
        const currentRepairQty = parseFloat(invStatus.repair_qty) || 0;
        const newRepairQty = Math.max(0, currentRepairQty - qty);
        await invStatus.update({ repair_qty: newRepairQty }, { transaction: t });

        // If returned to stock or replaced, increase available_qty and sync products table
        if (return_to_stock || service.service_type === 'EXCHANGE') {
          await invStatus.increment('available_qty', { by: qty, transaction: t });
          await products.increment('stock_quantity', { by: qty, where: { product_id: productId }, transaction: t });
        }
      }

      return service;
    });

    res.status(200).json({ success: true, message: 'Status updated successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
