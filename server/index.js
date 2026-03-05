require('dotenv').config(); // Loads .env variables
const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON data

// Database Connection via Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false, // Keeps terminal clean
  }
);

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully.');
    // Sync models (creates tables if they don't exist)
    await sequelize.sync();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

connectDB();

// Default Route for Testing
app.get('/', (req, res) => {
  res.json({ message: "Welcome to your POS System API!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
