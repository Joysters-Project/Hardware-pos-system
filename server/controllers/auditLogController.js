const { audit_log, users } = require('../models');
const { Op, fn, col } = require('sequelize');

const RETENTION = {
  recentMonths:  parseInt(process.env.AUDIT_RECENT_MONTHS  || '6',  10),
  archiveMonths: parseInt(process.env.AUDIT_ARCHIVE_MONTHS || '18', 10),
};

function buildWhere({ search, action, user_id, from, to, view }) {
  const where = {};
  const now = new Date();

  if (view === 'archived') {
    const archiveCutoff = new Date(now);
    archiveCutoff.setMonth(archiveCutoff.getMonth() - RETENTION.recentMonths);
    const oldestCutoff = new Date(now);
    oldestCutoff.setMonth(oldestCutoff.getMonth() - RETENTION.archiveMonths);
    where.time = { [Op.lt]: archiveCutoff, [Op.gte]: oldestCutoff };
  } else {
    const recentCutoff = new Date(now);
    recentCutoff.setMonth(recentCutoff.getMonth() - RETENTION.recentMonths);
    where.time = { [Op.gte]: recentCutoff };
  }

  if (from || to) {
    where.time = {};
    if (from) where.time[Op.gte] = new Date(from);
    if (to)   where.time[Op.lte] = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  if (action)  where.action  = { [Op.like]: `%${action}%` };
  if (user_id) where.user_id = user_id;

  return where;
}

function buildInclude(search) {
  return [{
    model: users,
    attributes: ['user_id', 'user_name', 'first_name', 'last_name'],
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
  }];
}

// GET /api/audit_log — last 6 months
exports.getAllAuditLogs = async (req, res) => {
  try {
    const { search, action, user_id, from, to, page = 1, limit = 20 } = req.query;
    const where        = buildWhere({ search, action, user_id, from, to, view: 'recent' });
    const includeOpts  = buildInclude(search);
    const parsedLimit  = parseInt(limit);
    const offset       = (parseInt(page) - 1) * parsedLimit;

    const count = await audit_log.count({ where, include: search ? includeOpts : [], distinct: true, col: 'log_id' });
    const rows  = await audit_log.findAll({ where, include: includeOpts, order: [['time', 'DESC']], limit: parsedLimit, offset, subQuery: false });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / parsedLimit), data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/audit_log/archived — 6 to 18 months old
exports.getArchivedLogs = async (req, res) => {
  try {
    const { search, action, user_id, from, to, page = 1, limit = 20 } = req.query;
    const where        = buildWhere({ search, action, user_id, from, to, view: 'archived' });
    const includeOpts  = buildInclude(search);
    const parsedLimit  = parseInt(limit);
    const offset       = (parseInt(page) - 1) * parsedLimit;

    const count = await audit_log.count({ where, include: search ? includeOpts : [], distinct: true, col: 'log_id' });
    const rows  = await audit_log.findAll({ where, include: includeOpts, order: [['time', 'DESC']], limit: parsedLimit, offset, subQuery: false });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / parsedLimit), data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/audit_log/actions — distinct action list for filter dropdown
exports.getActions = async (req, res) => {
  try {
    const rows = await audit_log.findAll({
      attributes: [[fn('DISTINCT', col('action')), 'action']],
      raw: true,
    });
    res.json(rows.map(r => r.action).filter(Boolean).sort());
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/audit_log/:id
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await audit_log.findByPk(req.params.id, { include: buildInclude() });
    if (!log) return res.status(404).json({ message: 'Audit log not found' });
    res.json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/audit_log/:id — auto-deletion by retention cron (18 months)
async function performRetention() {
  const BATCH_SIZE = 200;
  const now    = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - RETENTION.archiveMonths);

  const ids = (await audit_log.findAll({
    where: { time: { [Op.lt]: cutoff } },
    attributes: ['log_id'],
    order: [['time', 'ASC']],
    raw: true,
  })).map(r => r.log_id);

  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    await audit_log.destroy({ where: { log_id: { [Op.in]: ids.slice(i, i + BATCH_SIZE) } } });
    deleted += Math.min(BATCH_SIZE, ids.length - i);
  }

  return { ran_at: now.toISOString(), deleted, cutoff_date: cutoff.toISOString(), retention_months: RETENTION.archiveMonths };
}

exports.performRetention = performRetention;