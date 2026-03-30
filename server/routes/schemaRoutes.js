const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schemaController');

// GET all available tables
router.get('/tables', schemaController.getAllTables);

// GET schema for a specific table
router.get('/table/:tableName', schemaController.getTableSchema);

module.exports = router;
