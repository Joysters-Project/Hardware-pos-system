const { audit_log, users } = require('../models');
const { Op } = require('sequelize');

// GET /api/audit_log — all logs with filters, search, pagination (Admin only)
exports.getAllAuditLogs = async (req, res) => {
  try {
    const { search, action, user_id, from, to, page = 1, limit = 20 } = req.query;
    const where = {};

    if (action)  where.action  = { [Op.like]: `%${action}%` };
    if (user_id) where.user_id = user_id;
    if (from || to) {
      where.time = {};
      if (from) where.time[Op.gte] = new Date(from);
      if (to)   where.time[Op.lte] = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await audit_log.findAndCountAll({
      where,
      include: [{
        model: users,
        attributes: ['user_id', 'user_name', 'first_name', 'last_name'],
        // search filter across joined user name
        ...(search ? {
          where: {
            [Op.or]: [
              { user_name:  { [Op.like]: `%${search}%` } },
              { first_name: { [Op.like]: `%${search}%` } },
              { last_name:  { [Op.like]: `%${search}%` } },
            ]
          },
          required: true,
        } : { required: false }),
      }],
      order: [['time', 'DESC']],
      limit:  parseInt(limit),
      offset,
    });

    res.status(200).json({
      total: count,
      page:  parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data:  rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/audit_log/:id
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await audit_log.findByPk(req.params.id, {
      include: [{ model: users, attributes: ['user_id', 'user_name', 'first_name', 'last_name'] }],
    });
    if (!log) return res.status(404).json({ message: 'Audit log not found' });
    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/audit_log/user/:userId
exports.getLogsByUser = async (req, res) => {
  try {
    const logs = await audit_log.findAll({
      where: { user_id: req.params.userId },
      order: [['time', 'DESC']],
      limit: 100,
    });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/audit_log/:id (Admin only)
exports.deleteAuditLog = async (req, res) => {
  try {
    const log = await audit_log.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Audit log not found' });
    await log.destroy();
    res.status(200).json({ message: 'Audit log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/audit_log/actions — distinct action list for filter dropdown
exports.getActions = async (req, res) => {
  try {
    const rows = await audit_log.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('action')), 'action']],
      raw: true,
    });
    res.status(200).json(rows.map(r => r.action).filter(Boolean).sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
