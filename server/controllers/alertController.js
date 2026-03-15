const { alerts } = require('../models');

// CREATE Alert
exports.createAlert = async (req, res) => {
  try {
    const alert = await alerts.create(req.body);
    res.status(201).json({
      message: "Alert created successfully",
      data: alert
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const alertList = await alerts.findAll();
    res.status(200).json(alertList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.status(200).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Alert
exports.updateAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    await alert.update(req.body);

    res.status(200).json({
      message: "Alert updated successfully",
      data: alert
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Alert
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    await alert.destroy();

    res.status(200).json({
      message: "Alert deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};