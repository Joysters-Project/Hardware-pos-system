const { audit_log } = require('../models');

// CREATE Audit Log
exports.createAuditLog = async (req, res) => {
  try {
    const audit = await audit_log.create(req.body);

    res.status(201).json({
      message: "Audit log created successfully",
      data: audit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Audit Logs
exports.getAllAuditLogs = async (req, res) => {
  try {
    const audits = await audit_log.findAll();

    res.status(200).json(audits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Audit Log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const audit = await audit_log.findByPk(req.params.id);

    if (!audit) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.status(200).json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Audit Log
exports.updateAuditLog = async (req, res) => {
  try {
    const audit = await audit_log.findByPk(req.params.id);

    if (!audit) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    await audit.update(req.body);

    res.status(200).json({
      message: "Audit log updated successfully",
      data: audit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Audit Log
exports.deleteAuditLog = async (req, res) => {
  try {
    const audit = await audit_log.findByPk(req.params.id);

    if (!audit) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    await audit.destroy();

    res.status(200).json({
      message: "Audit log deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};