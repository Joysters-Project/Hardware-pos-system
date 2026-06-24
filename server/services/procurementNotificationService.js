const { procurement_notifications } = require('../models');

/**
 * createNotification
 * Creates a notification in the procurement system.
 */
const createNotification = async (type, title, message, reference_type = null, reference_id = null, severity = 'info') => {
  try {
    return await procurement_notifications.create({
      type,
      title,
      message,
      reference_type,
      reference_id,
      severity,
      status: 'unread'
    });
  } catch (err) {
    console.error(`[ProcurementNotificationService] Error creating notification: ${err.message}`);
  }
};

/**
 * getUnreadCount
 * Returns the count of unread procurement notifications.
 */
const getUnreadCount = async () => {
  try {
    return await procurement_notifications.count({
      where: { status: 'unread' }
    });
  } catch (err) {
    console.error(`[ProcurementNotificationService] Error getting unread count: ${err.message}`);
    return 0;
  }
};

/**
 * markAsRead
 * Marks a list of notification IDs as read.
 */
const markAsRead = async (ids) => {
  try {
    return await procurement_notifications.update(
      { status: 'read' },
      { where: { notification_id: ids } }
    );
  } catch (err) {
    console.error(`[ProcurementNotificationService] Error marking as read: ${err.message}`);
    throw err;
  }
};

/**
 * archiveNotifications
 * Archives a list of notification IDs.
 */
const archiveNotifications = async (ids) => {
  try {
    return await procurement_notifications.update(
      { status: 'archived' },
      { where: { notification_id: ids } }
    );
  } catch (err) {
    console.error(`[ProcurementNotificationService] Error archiving notifications: ${err.message}`);
    throw err;
  }
};

/**
 * getAll
 * Retrieves notifications with optional status filter.
 */
const getAll = async (status = null) => {
  try {
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    return await procurement_notifications.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
  } catch (err) {
    console.error(`[ProcurementNotificationService] Error retrieving notifications: ${err.message}`);
    throw err;
  }
};

module.exports = {
  createNotification,
  getUnreadCount,
  markAsRead,
  archiveNotifications,
  getAll
};
