const { purchase_orders, po_items, products, suppliers, alerts, auto_reorder_suggestions, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/auditService');
const supplierPaymentService = require('../services/supplierPaymentService');
const emailService = require('../services/emailService');
const procurementNotificationService = require('../services/procurementNotificationService');
const forecastService = require('../services/forecastService');
const supplierPerformanceService = require('../services/supplierPerformanceService');

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

// Valid status transitions
const TRANSITIONS = {
  Pending:  ['Approved', 'Cancelled'],
  Approved: ['Shipped',  'Cancelled'],
  Shipped:  ['Received', 'Cancelled'],
};

// POST /api/procurement/purchase-orders
exports.createPurchaseOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, ...poData } = req.body;

    if (!poData.supplier_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'supplier_id is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Auto-generate PO number PO-YYYY-NNNN
    const maxId = (await purchase_orders.max('po_id', { transaction })) || 0;
    const year  = new Date().getFullYear();
    const poNumber = `PO-${year}-${String(maxId + 1).padStart(4, '0')}`;

    // Calculate total from items
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.unit_price) * Number(i.quantity)), 0);

    const po = await purchase_orders.create({
      ...poData,
      po_number:   poNumber,
      po_date:     poData.po_date || new Date().toISOString().split('T')[0],
      status:      poData.status  || 'Pending',
      total_amount: totalAmount,
      created_by:  req.user?.user_id || null,
    }, { transaction });

    const itemsData = items.map((item) => ({
      po_id:       po.po_id,
      product_id:  item.product_id,
      quantity:    item.quantity,
      unit_price:  item.unit_price,
      total_price: Number(item.unit_price) * Number(item.quantity),
    }));
    await po_items.bulkCreate(itemsData, { transaction });

    await transaction.commit();

    for (const item of items) {
      await alerts.update(
        { status: 'Purchase Ordered', purchase_order_id: po.po_id },
        { where: { product_id: item.product_id, status: 'Active' } }
      ).catch(err => console.error(`[PO Controller] Alert update failed for product ${item.product_id}: ${err.message}`));
    }

    // 1. Auto-create pending payment record
    await supplierPaymentService.createPaymentRecord(
      po.po_id,
      po.supplier_id,
      null,
      po.total_amount,
      po.expected_delivery
    ).catch(err => console.error(`[PO Controller] Payment record creation failed: ${err.message}`));

    // 2. Fetch full PO with associations for email/notifications
    const fullPO = await purchase_orders.findByPk(po.po_id, {
      include: [
        { model: suppliers },
        { model: po_items, include: [products] }
      ]
    });

    if (fullPO) {
      // Send Email asynchronously
      if (fullPO.supplier?.email) {
        emailService.sendPOCreatedEmail(fullPO).catch(err => {
          console.error(`[PO Controller] Email send failed: ${err.message}`);
        });
      }

      // Create Notification
      await procurementNotificationService.createNotification(
        'PO_CREATED',
        `New Purchase Order: ${fullPO.po_number}`,
        `Purchase order ${fullPO.po_number} created for supplier ${fullPO.supplier?.supplier_name || 'unknown'} of LKR ${Number(fullPO.total_amount).toLocaleString()}`,
        'purchase_order',
        fullPO.po_id,
        'info'
      ).catch(err => console.error(`[PO Controller] Notification failed: ${err.message}`));
    }

    await logActivity(
      req.user?.user_id, req.user?.role,
      'CREATE_PURCHASE_ORDER',
      `Created PO ${poNumber} for supplier_id=${poData.supplier_id}, total=LKR${totalAmount.toFixed(2)}`,
      getIp(req)
    );

    res.status(201).json({ message: 'Purchase Order created successfully', data: po });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/purchase-orders
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const pos = await purchase_orders.findAll({
      include: [
        { model: suppliers, attributes: ['supplier_id', 'supplier_name', 'phone'] },
        { model: po_items,  include: [{ model: products, attributes: ['product_id', 'product_name', 'cost_price'] }] },
      ],
      order: [['po_date', 'DESC']],
    });
    res.status(200).json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/purchase-orders/:id
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: po_items,  include: [{ model: products }] },
      ],
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    res.status(200).json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/procurement/purchase-orders/:id/status
exports.updateStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const po = await purchase_orders.findByPk(req.params.id, {
      include: [{ model: po_items }],
      transaction,
    });
    if (!po) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    const { status, notes, cancel_reason } = req.body;
    const currentStatus = po.status;

    // Validate transition
    if (status !== 'Cancelled') {
      const allowed = TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(status)) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Cannot transition from ${currentStatus} to ${status}`,
        });
      }
    }

    // RBAC: only Admin/Manager can approve
    if (status === 'Approved') {
      const role = (req.user?.role || '').toLowerCase();
      if (!['admin', 'manager'].includes(role)) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Only Admin or Manager can approve purchase orders' });
      }
    }

    // Cancelled: require reason
    if (status === 'Cancelled' && !cancel_reason && !notes) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const updateData = { status };
    if (notes || cancel_reason) updateData.notes = cancel_reason || notes;

    // On Received: update stock, record delivery date, resolve alerts, close suggestions
    if (status === 'Received') {
      updateData.actual_delivery_date = new Date().toISOString().split('T')[0];

      for (const item of po.po_items) {
        await products.increment('stock_quantity', {
          by: item.quantity,
          where: { product_id: item.product_id },
          transaction,
        });

        // Record inventory movement
        await logActivity(
          req.user?.user_id, req.user?.role,
          'INVENTORY_MOVEMENT',
          `Received ${item.quantity} units of product_id=${item.product_id} from PO ${po.po_number || '#' + po.po_id}`,
          getIp(req)
        ).catch(() => {});

        // Resolve any low-stock alerts for this product
        await alerts.update(
          { is_resolved: true, resolved_date: new Date() },
          { where: { product_id: item.product_id, is_resolved: false }, transaction }
        ).catch(() => {});

        // Close related auto-reorder suggestions for this product
        await auto_reorder_suggestions.update(
          { status: 'Converted', converted_po_id: po.po_id },
          { where: { product_id: item.product_id, status: { [Op.in]: ['Pending', 'Approved'] } }, transaction }
        ).catch(() => {});
      }
    }

    await po.update(updateData, { transaction });
    await transaction.commit();

    // ─── Post-Commit Hooks (Asynchronous) ──────────────────────────────────
    try {
      const fullPO = await purchase_orders.findByPk(po.po_id, {
        include: [
          { model: suppliers },
          { model: po_items, include: [products] }
        ]
      });

      if (fullPO) {
        // 1. Recalculate supplier score and product forecasts on Received
        if (status === 'Received') {
          supplierPerformanceService.calculateSupplierScore(fullPO.supplier_id)
            .catch(err => console.error(`[PO Status Update] Score recalculation failed: ${err.message}`));

          for (const item of fullPO.po_items) {
            forecastService.getProductForecast(item.product_id)
              .catch(err => console.error(`[PO Status Update] Product forecast recalculation failed: ${err.message}`));
          }
        }

        // 2. Send status update email to supplier
        if (fullPO.supplier?.email) {
          if (status === 'Cancelled') {
            emailService.sendPOCancelledEmail(fullPO).catch(err => {
              console.error(`[PO Status Update] Failed to send cancel email: ${err.message}`);
            });
          } else {
            emailService.sendPOStatusUpdateEmail(fullPO).catch(err => {
              console.error(`[PO Status Update] Failed to send status email: ${err.message}`);
            });
          }
        }

        // 3. Create procurement notification
        let severity = 'info';
        if (status === 'Cancelled') severity = 'warning';
        
        await procurementNotificationService.createNotification(
          `PO_${status.toUpperCase()}`,
          `Purchase Order ${fullPO.po_number} is ${status}`,
          `The status of Purchase Order ${fullPO.po_number} for ${fullPO.supplier?.supplier_name} has been updated to ${status}.`,
          'purchase_order',
          fullPO.po_id,
          severity
        ).catch(err => console.error(`[PO Status Update] Notification failed: ${err.message}`));
      }
    } catch (hookError) {
      console.error(`[PO Status Update] Error executing post-commit hooks: ${hookError.message}`);
    }

    await logActivity(
      req.user?.user_id, req.user?.role,
      'UPDATE_PO_STATUS',
      `PO ${po.po_number} status changed from ${currentStatus} → ${status}`,
      getIp(req)
    );

    res.status(200).json({ message: `Purchase Order ${status.toLowerCase()} successfully`, data: po });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// CANCEL shortcut (kept for backward compat with existing frontend)
exports.cancelPurchaseOrder = async (req, res) => {
  req.body.status = 'Cancelled';
  req.body.cancel_reason = req.body.notes || req.body.cancel_reason || 'Cancelled by user';
  return exports.updateStatus(req, res);
};

// DELETE /api/procurement/purchase-orders/:id (only Pending)
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    if (po.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending orders can be deleted' });
    }

    await po.destroy();

    await logActivity(
      req.user?.user_id, req.user?.role,
      'DELETE_PURCHASE_ORDER',
      `Deleted PO ${po.po_number}`,
      getIp(req)
    );

    res.status(200).json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/procurement/purchase-orders/:id/send-email
exports.sendPOEmail = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: po_items, include: [products] },
      ],
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    if (!po.supplier?.email) return res.status(400).json({ error: 'Supplier has no email configured' });

    await emailService.sendPOCreatedEmail(po);
    res.json({ message: `Purchase Order email sent to ${po.supplier.email}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/procurement/purchase-orders/:poId/items/:itemId/send-comment-email
exports.sendItemCommentEmail = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.poId, {
      include: [{ model: suppliers }, { model: po_items, include: [products] }],
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    if (!po.supplier?.email) return res.status(400).json({ error: 'Supplier has no email configured' });

    const item = po.po_items?.find(i => i.id === parseInt(req.params.itemId));
    if (!item) return res.status(404).json({ message: 'Line item not found' });
    if (!item.comment?.trim()) return res.status(400).json({ error: 'No comment to send for this item' });

    await emailService.sendItemCommentEmail({
      supplier:    po.supplier,
      poNumber:    po.po_number || `#${po.po_id}`,
      productName: item.product?.product_name || `Product #${item.product_id}`,
      quantity:    item.quantity,
      unitPrice:   item.unit_price,
      comment:     item.comment,
    });

    res.json({ message: `Item note emailed to ${po.supplier.email}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/procurement/purchase-orders/:poId/items/:itemId/comment
exports.updateItemComment = async (req, res) => {
  try {
    const item = await po_items.findOne({
      where: { id: req.params.itemId, po_id: req.params.poId },
    });
    if (!item) return res.status(404).json({ message: 'Line item not found' });
    await item.update({ comment: req.body.comment || null });
    res.json({ message: 'Comment updated', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// EXPORT PDF
exports.exportPurchaseOrderPDF = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: po_items, include: [products] }
      ],
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    const pdfService = require('../services/pdfService');
    const pdfBuffer = await pdfService.generatePurchaseOrderPDF(po);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PurchaseOrder_${po.po_number || po.po_id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
