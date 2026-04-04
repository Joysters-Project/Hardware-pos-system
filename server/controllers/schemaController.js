const { sequelize } = require('../models');

// Get table schema/attributes
exports.getTableSchema = async (req, res) => {
  try {
    const { tableName } = req.params;

    // Validate table name to prevent SQL injection
    const allowedTables = ['category', 'brands', 'units', 'products', 'customers', 'suppliers', 'employees', 'departments', 'users'];
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ error: `Table '${tableName}' is not allowed or doesn't exist` });
    }

    // Get table metadata from Sequelize
    const model = sequelize.models[tableName];
    if (!model) {
      return res.status(404).json({ error: `Model for table '${tableName}' not found` });
    }

    // Extract attributes info
    const attributes = model.rawAttributes;
    const schemaInfo = [];

    for (const [attrName, attrConfig] of Object.entries(attributes)) {
      schemaInfo.push({
        columnName: attrName,
        type: attrConfig.type ? attrConfig.type.constructor.name : 'unknown',
        nullable: attrConfig.allowNull !== false,
        primaryKey: attrConfig.primaryKey || false,
        autoIncrement: attrConfig.autoIncrement || false,
        defaultValue: attrConfig.defaultValue || null,
        unique: attrConfig.unique || false,
        comment: attrConfig.comment || '',
      });
    }

    res.status(200).json({
      tableName: tableName,
      columnCount: schemaInfo.length,
      attributes: schemaInfo,
    });
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all available tables
exports.getAllTables = async (req, res) => {
  try {
    const tables = Object.keys(sequelize.models);
    const tablesInfo = [];

    for (const tableName of tables) {
      const model = sequelize.models[tableName];
      const attributes = model.rawAttributes;
      
      tablesInfo.push({
        tableName: tableName,
        columnCount: Object.keys(attributes).length,
        columns: Object.keys(attributes),
      });
    }

    res.status(200).json(tablesInfo);
  } catch (error) {
    console.error('Tables fetch error:', error);
    res.status(500).json({ error: error.message });
  }
};
