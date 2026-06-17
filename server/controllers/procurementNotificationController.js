const notificationService = require('../services/procurementNotificationService');

/**
 * getAll
 * GET /api/procurement/notifications
 */
exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const list = await notificationService.getAll(status);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getUnreadCount
 * GET /api/procurement/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * markAsRead
 * PUT /api/procurement/notifications/mark-read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await notificationService.markAsRead(ids);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * archive
 * PUT /api/procurement/notifications/archive
 */
exports.archive = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await notificationService.archiveNotifications(ids);
    res.json({ message: 'Notifications archived successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
