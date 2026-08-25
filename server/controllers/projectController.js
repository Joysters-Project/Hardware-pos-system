const { Op } = require('sequelize');
const db = require('../models');
const emailService = require('../services/emailService');
const { logActivity } = require('../services/auditService');
const { normalizeDepartmentSelection, serializeDepartmentSelection } = require('../utils/projectDepartmentUtils');

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

const getDayBounds = (dateValue = new Date()) => {
  const targetDate = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildTransactionRef = () => `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ── GET all projects ──────────────────────────────────────────────────────────
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await db.projects.findAll({
      include: [{ model: db.users, as: 'creator', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(projects.map((project) => ({
      ...project.toJSON(),
      project_departments: normalizeDepartmentSelection(project.project_departments),
    })));
  } catch (err) {
    console.error('[Projects] getAllProjects error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET active projects only (for cashier dropdown) ───────────────────────────
exports.getActiveProjects = async (req, res) => {
  try {
    const projects = await db.projects.findAll({
      where: { status: 'Active' },
      attributes: ['project_id', 'project_name', 'project_type', 'project_owner', 'location', 'status', 'project_departments'],
      order: [['project_name', 'ASC']],
    });
    res.json(projects.map((project) => ({
      ...project.toJSON(),
      project_departments: normalizeDepartmentSelection(project.project_departments),
    })));
  } catch (err) {
    console.error('[Projects] getActiveProjects error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET single project with all items ────────────────────────────────────────
exports.getProjectById = async (req, res) => {
  try {
    const project = await db.projects.findById(req.params.id, {
      include: [
        { model: db.users, as: 'creator', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
        {
          model: db.project_items, as: 'items',
          include: [
            { model: db.products, as: 'product', attributes: ['product_id', 'product_name', 'unit_price'] },
            { model: db.users, as: 'takenByUser', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
          ],
          order: [['taken_at', 'DESC']],
        },
      ],
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({
      ...project.toJSON(),
      project_departments: normalizeDepartmentSelection(project.project_departments),
    });
  } catch (err) {
    console.error('[Projects] getProjectById error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── CREATE project (admin/manager only) ──────────────────────────────────────
exports.createProject = async (req, res) => {
  const ip = getIp(req);
  try {
    const { project_name, project_owner, location, project_type, project_departments, description, status, start_date, deadline, end_date } = req.body;

    if (!project_name || !start_date) {
      return res.status(400).json({ message: 'Project name and start date are required' });
    }

    const payload = {
      project_name,
      project_owner: project_owner || null,
      location: location || null,
      project_type: project_type || 'Hardware',
      project_departments: serializeDepartmentSelection(project_departments),
      description: description || null,
      start_date,
      deadline: deadline || null,
      end_date: end_date || null,
      status: status || 'Active',
      created_by: req.user?.user_id || 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const project = await db.projects.create(payload);
    console.log(`[Projects] ✅ Created project "${project_name}" by user_id: ${payload.created_by}`);
    await logActivity(req.user?.user_id, req.user?.role, 'CREATE_PROJECT',
      `Project created: "${project_name}" (ID: ${project.project_id}), Type: ${project_type || 'Hardware'}`, ip);

    res.status(201).json(project);
  } catch (err) {
    console.error('[Projects] createProject error:', err.message);
    if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE project status/details (admin/manager only) ───────────────────────
exports.updateProject = async (req, res) => {
  const ip = getIp(req);
  try {
    const project = await db.projects.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { project_name, project_owner, location, project_type, project_departments, description, status, start_date, deadline, end_date, final_cost, final_payment } = req.body;
    const nextStatus = status !== undefined ? status : project.status;
    const isClosingStatus = ['Completed', 'Cancelled'].includes(nextStatus);

    let resolvedFinalPayment = final_payment !== undefined
      ? final_payment
      : (final_cost !== undefined ? final_cost : project.final_cost);

    let estimatedCost = 0;
    if (isClosingStatus) {
      const items = await db.project_items.findAll({ where: { project_id: project.project_id } });
      estimatedCost = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

      if (resolvedFinalPayment === undefined || resolvedFinalPayment === null || resolvedFinalPayment === '') {
        return res.status(400).json({
          message: 'Please enter the final payment amount before closing the project.',
          estimated_cost: estimatedCost,
        });
      }
    }

    const nextEndDate = end_date !== undefined ? (end_date === '' ? null : end_date) : project.end_date;
    const nextFinalCost = isClosingStatus
      ? (resolvedFinalPayment === '' ? null : Number(resolvedFinalPayment))
      : (final_payment !== undefined && resolvedFinalPayment !== '' ? Number(resolvedFinalPayment) : project.final_cost);

    await project.update({
      project_name:  project_name  || project.project_name,
      project_owner: project_owner !== undefined ? project_owner : project.project_owner,
      location:      location      !== undefined ? location      : project.location,
      project_type:  project_type  || project.project_type,
      project_departments: project_departments !== undefined ? serializeDepartmentSelection(project_departments) : project.project_departments,
      description:   description   !== undefined ? description   : project.description,
      status:        nextStatus,
      start_date:    start_date    || project.start_date,
      deadline:      deadline      !== undefined ? deadline      : project.deadline,
      end_date:      nextEndDate,
      final_cost:    nextFinalCost,
      updated_at: new Date(),
    });

    console.log(`[Projects] ✅ Updated project_id: ${req.params.id}`);
    await logActivity(req.user?.user_id, req.user?.role, 'UPDATE_PROJECT',
      `Project ID ${req.params.id} ("${project.project_name}") updated. Status: ${nextStatus}`, ip);

    res.json({ project, estimated_cost: estimatedCost, final_payment: resolvedFinalPayment });
  } catch (err) {
    console.error('[Projects] updateProject error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── ADD PAYMENT to project (admin only) ──────────────────────────────────────
exports.addPayment = async (req, res) => {
  try {
    const project = await db.projects.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }
    const newPaid = Number(project.amount_paid) + Number(amount);
    await project.update({ amount_paid: newPaid, updated_at: new Date() });
    console.log(`[Projects] 💰 Payment LKR ${amount} added to project_id: ${req.params.id}`);
    res.json({ amount_paid: newPaid, final_cost: project.final_cost });
  } catch (err) {
    console.error('[Projects] addPayment error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE project (admin only) ───────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  const ip = getIp(req);
  try {
    const project = await db.projects.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const name = project.project_name;
    await db.project_items.destroy({ where: { project_id: req.params.id } });
    await project.destroy();
    console.log(`[Projects] 🗑️  Deleted project_id: ${req.params.id}`);
    await logActivity(req.user?.user_id, req.user?.role, 'DELETE_PROJECT',
      `Project deleted: "${name}" (ID: ${req.params.id})`, ip);

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('[Projects] deleteProject error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── ADD ITEM to project (cashier) — deducts stock ────────────────────────────
exports.addProjectItem = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { project_id, note, receiver_name, receiver_phone } = req.body;
    const incomingItems = Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items
      : (req.body.product_id ? [{ product_id: req.body.product_id, quantity: req.body.quantity }] : []);

    if (!project_id || !incomingItems.length) {
      await t.rollback();
      return res.status(400).json({ message: 'project_id and at least one item are required' });
    }

    const resolvedReceiverName = receiver_name ? String(receiver_name).trim() : '';
    const resolvedReceiverPhone = receiver_phone ? String(receiver_phone).trim() : '';
    if (!resolvedReceiverName || !resolvedReceiverPhone) {
      await t.rollback();
      return res.status(400).json({ message: 'receiver_name and receiver_phone are required' });
    }

    // Validate project is active
    const project = await db.projects.findById(project_id, { transaction: t });
    if (!project) { await t.rollback(); return res.status(404).json({ message: 'Project not found' }); }
    if (project.status !== 'Active') { await t.rollback(); return res.status(400).json({ message: 'Cannot add items to a non-active project' }); }

    const transactionRef = buildTransactionRef();
    const takenAt = new Date();
    const createdItems = [];

    for (const incomingItem of incomingItems) {
      const productId = Number(incomingItem.product_id);
      const quantity = Number(incomingItem.quantity);

      if (!productId || !quantity || quantity <= 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Each item requires a valid product_id and quantity' });
      }

      const product = await db.products.findById(productId, { transaction: t });
      if (!product) { await t.rollback(); return res.status(404).json({ message: 'Product not found' }); }
      if (product.stock_quantity < quantity) {
        await t.rollback();
        return res.status(400).json({ message: `Insufficient stock. Available: ${product.stock_quantity}` });
      }

      await product.update({ stock_quantity: product.stock_quantity - quantity }, { transaction: t });

      const item = await db.project_items.create({
        project_id,
        product_id: productId,
        quantity,
        unit_price: product.unit_price,
        note: note || incomingItem.note || null,
        receiver_name: resolvedReceiverName,
        receiver_phone: resolvedReceiverPhone,
        transaction_ref: transactionRef,
        taken_by: req.user.user_id,
        taken_at: takenAt,
      }, { transaction: t });

      createdItems.push(item);
    }

    await t.commit();

    const io = req.app.get('io');
    if (io) io.emit('products:updated');

    // Return item(s) with product details
    const fullItems = await db.project_items.findAll({
      where: { transaction_ref: transactionRef },
      order: [['item_id', 'ASC']],
      include: [
        { model: db.products, as: 'product', attributes: ['product_id', 'product_name', 'unit_price'] },
        { model: db.users, as: 'takenByUser', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
      ],
    });

    console.log(`[Projects] ✅ Added ${createdItems.length} item(s) to project_id: ${project_id} by user_id: ${req.user.user_id}`);
    if (incomingItems.length === 1) {
      res.status(201).json(fullItems[0]);
    } else {
      res.status(201).json({ transaction_ref: transactionRef, items: fullItems });
    }
  } catch (err) {
    await t.rollback();
    console.error('[Projects] addProjectItem error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE all items for a product sold today ───────────────────────────────
exports.deleteTodayProductSales = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const productId = Number(req.params.productId);
    if (!productId) {
      await t.rollback();
      return res.status(400).json({ message: 'Valid productId is required' });
    }

    const { project_id, date } = req.query;
    const { start, end } = getDayBounds(date || new Date());

    const where = {
      product_id: productId,
      taken_at: { $between: [start, end] },
    };
    if (project_id) where.project_id = project_id;

    const items = await db.project_items.findAll({ where, transaction: t });
    if (!items.length) {
      await t.rollback();
      return res.status(404).json({ message: 'No sales found for this product today' });
    }

    for (const item of items) {
      const product = await db.products.findById(item.product_id, { transaction: t });
      if (product) {
        await product.update({ stock_quantity: Number(product.stock_quantity) + Number(item.quantity) }, { transaction: t });
      }
      await item.destroy({ transaction: t });
    }

    await t.commit();
    const io = req.app.get('io');
    if (io) io.emit('products:updated');
    res.json({ message: 'Product sales removed for today', removed: items.length });
  } catch (err) {
    await t.rollback();
    console.error('[Projects] deleteTodayProductSales error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE project item — restores stock & notifies Admin via Email ─────────
exports.deleteProjectItem = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'Reason for deletion is required' });
    }

    const item = await db.project_items.findById(req.params.itemId, {
      include: [
        { model: db.projects, as: 'project' },
        { model: db.products, as: 'product' },
        { model: db.users, as: 'takenByUser' },
      ],
      transaction: t,
    });

    if (!item) {
      await t.rollback();
      return res.status(404).json({ message: 'Item not found' });
    }

    const removedByUser = req.user
      ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username
      : 'Cashier/User';

    const itemDetails = {
      project_name: item.project?.project_name || `Project #${item.project_id}`,
      product_name: item.product?.product_name || `Product #${item.product_id}`,
      quantity: item.quantity,
      receiver_name: item.receiver_name || '—',
      receiver_phone: item.receiver_phone || '—',
      taken_at: item.taken_at,
      removed_by: removedByUser,
      reason: reason.trim(),
    };

    // Restore stock
    const product = await db.products.findById(item.product_id, { transaction: t });
    if (product) {
      await product.update({ stock_quantity: Number(product.stock_quantity) + Number(item.quantity) }, { transaction: t });
    }

    await item.destroy({ transaction: t });
    await t.commit();
    console.log(`[Projects] ↩️  Removed item_id: ${req.params.itemId}, stock restored`);

    const io = req.app.get('io');
    if (io) io.emit('products:updated');

    // Notify Admin via Email asynchronously
    emailService.sendProjectItemRemovedNotification(itemDetails).catch((err) => {
      console.error('[Projects] Failed to send deletion email to admin:', err.message);
    });

    res.json({ message: 'Item removed, stock restored, and Admin notified by email.' });
  } catch (err) {
    await t.rollback();
    console.error('[Projects] deleteProjectItem error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET project items for a specific project ─────────────────────────────────
exports.getProjectItems = async (req, res) => {
  try {
    const items = await db.project_items.findAll({
      where: { project_id: req.params.id },
      include: [
        { model: db.products, as: 'product', attributes: ['product_id', 'product_name', 'unit_price'] },
        { model: db.users, as: 'takenByUser', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
      ],
      order: [['taken_at', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    console.error('[Projects] getProjectItems error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── DAILY REPORT — items taken today for a project ───────────────────────────
exports.getDailyReport = async (req, res) => {
  try {
    const { project_id, date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const where = { taken_at: { $between: [start, end] } };
    if (project_id) where.project_id = project_id;

    const items = await db.project_items.findAll({
      where,
      include: [
        { model: db.products, as: 'product', attributes: ['product_id', 'product_name', 'unit_price'] },
        { model: db.users, as: 'takenByUser', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
        { model: db.projects, attributes: ['project_id', 'project_name', 'project_type', 'final_cost', 'status'] },
      ],
      order: [['taken_at', 'DESC']],
    });

    const totalValue = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
    res.json({ date: targetDate.toISOString().split('T')[0], items, totalValue, totalItems: items.length });
  } catch (err) {
    console.error('[Projects] getDailyReport error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── MONTHLY REPORT ────────────────────────────────────────────────────────────
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);

    const items = await db.project_items.findAll({
      where: { taken_at: { $between: [start, end] } },
      include: [
        { model: db.products, as: 'product', attributes: ['product_id', 'product_name', 'unit_price'] },
        { model: db.projects, attributes: ['project_id', 'project_name', 'project_type', 'final_cost', 'status'] },
        { model: db.users, as: 'takenByUser', attributes: ['user_id', 'user_name', 'first_name', 'last_name'] },
      ],
      order: [['taken_at', 'DESC']],
    });

    const byProject = {};
    items.forEach(item => {
      const pid = item.project_id;
      if (!byProject[pid]) {
        byProject[pid] = {
          project: item.project,
          items: [],
          totalValue: 0,
          totalQty: 0,
          projectIncome: Number(item.project?.final_cost || 0),
        };
      }
      byProject[pid].items.push(item);
      byProject[pid].totalValue += Number(item.quantity) * Number(item.unit_price);
      byProject[pid].totalQty  += Number(item.quantity);
    });

    const totalValue = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
    const totalProjectIncome = Object.values(byProject).reduce((sum, entry) => sum + Number(entry.projectIncome || 0), 0);
    res.json({ year: y, month: m, byProject: Object.values(byProject), totalValue, totalItems: items.length, totalProjectIncome });
  } catch (err) {
    console.error('[Projects] getMonthlyReport error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── YEARLY REPORT ─────────────────────────────────────────────────────────────
exports.getYearlyReport = async (req, res) => {
  try {
    const y = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(y, 0, 1);
    const end   = new Date(y, 11, 31, 23, 59, 59, 999);

    const items = await db.project_items.findAll({
      where: { taken_at: { $between: [start, end] } },
      include: [
        { model: db.products, as: 'product', attributes: ['product_id', 'product_name'] },
        { model: db.projects, attributes: ['project_id', 'project_name', 'project_type', 'final_cost', 'status', 'end_date', 'updated_at'] },
      ],
      order: [['taken_at', 'ASC']],
    });

    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, totalValue: 0, totalItems: 0, projectIncome: 0 }));
    items.forEach(item => {
      const m = new Date(item.taken_at).getMonth();
      byMonth[m].totalValue += Number(item.quantity) * Number(item.unit_price);
      byMonth[m].totalItems += 1;
    });

    const projects = await db.projects.findAll({
      where: {
        status: { $in: ['Completed', 'Cancelled'] },
        $or: [
          { end_date: { $between: [start, end] } },
          { updated_at: { $between: [start, end] } },
        ],
      },
      attributes: ['project_id', 'project_name', 'final_cost', 'end_date', 'updated_at'],
    });

    projects.forEach(project => {
      const bucket = new Date(project.end_date || project.updated_at).getMonth();
      if (bucket >= 0 && bucket < 12) {
        byMonth[bucket].projectIncome += Number(project.final_cost || 0);
      }
    });

    const totalValue = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
    const totalProjectIncome = projects.reduce((sum, project) => sum + Number(project.final_cost || 0), 0);
    res.json({ year: y, byMonth, totalValue, totalItems: items.length, totalProjectIncome });
  } catch (err) {
    console.error('[Projects] getYearlyReport error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
