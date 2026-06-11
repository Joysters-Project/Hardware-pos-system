const { audit_log } = require('../models');

/**
 * logActivity — fire-and-forget audit logger.
 * Never throws so a logging failure never breaks the main flow.
 *
 * @param {number} userId
 * @param {string} role
 * @param {string} action   e.g. 'LOGIN', 'UPDATE_EMPLOYEE'
 * @param {string} details  human-readable description of what changed
 * @param {string} ip       IP address from req
 */
const logActivity = async (userId, role, action, details, ip = null) => {
  try {
    if (!userId) return; // skip if no authenticated user
    await audit_log.create({
      user_id:    userId,
      role:       role   || 'Unknown',
      action:     action,
      details:    details || null,
      ip_address: ip     || null,
      time:       new Date(),
    });
  } catch (err) {
    // Log to console but never re-throw — audit must not crash the app
    console.warn(`[AuditLog] Failed to write: ${action} — ${err.message}`);
  }
};

module.exports = { logActivity };
