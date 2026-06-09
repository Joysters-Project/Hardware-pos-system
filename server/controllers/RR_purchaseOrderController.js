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
          emailService.sendPOStatusUpdateEmail(fullPO).catch(err => {
            console.error(`[PO Status Update] Failed to send status email: ${err.message}`);
          });
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

// EXPORT PDF — simple HTML response (pdfkit not needed, browser prints it)
exports.exportPurchaseOrderPDF = async (req, res) => {
  try {
    const po = await purchase_orders.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: po_items, include: [{ model: products, attributes: ['product_name', 'type', 'batch_no'] }] },
      ],
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    const itemRows = (po.po_items || []).map((item) => `
      <tr>
        <td>${item.product?.product_name || '-'}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">LKR ${Number(item.unit_price).toFixed(2)}</td>
        <td style="text-align:right">LKR ${Number(item.total_price).toFixed(2)}</td>
      </tr>`).join('');

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><title>PO ${po.po_number}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px}h1{color:#333}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}.total{text-align:right;font-size:18px;font-weight:bold;margin-top:16px}
      </style></head><body>
      <h1>Purchase Order — ${po.po_number}</h1>
      <p><b>Supplier:</b> ${po.supplier?.supplier_name || '-'} | <b>Date:</b> ${po.po_date} | <b>Status:</b> ${po.status}</p>
      <p><b>Expected Delivery:</b> ${po.expected_delivery || '-'}</p>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${itemRows}</tbody></table>
      <div class="total">Grand Total: LKR ${Number(po.total_amount).toFixed(2)}</div>
      ${po.notes ? `<p><b>Notes:</b> ${po.notes}</p>` : ''}
      <script>window.print();</script></body></html>`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
