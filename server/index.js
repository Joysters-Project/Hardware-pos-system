require('dotenv').config();
const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
//const db = require('./models'); // This automatically looks for models/index.js
// Setup Sequelize Connection
const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'mysql'
  }
);
const models = require('./models')(sequelize); 
const authRoutes = require('./routes/auth'); // Path to your routes/auth.js file
const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middleware
app.use(cors()); // Allows React to talk to this server
app.use(express.json()); // Allows server to read JSON from requests

// 2. Database Sync
// This ensures all 17 tables from your models folder are ready in MySQL
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced successfully');
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err.message);
  });

// 3. API Routes (Assignments for your team)
app.use('/api/auth',authRoutes);
// Member B's Product API
// const productRoutes = require('./routes/productRoutes');
// app.use('/api/products', productRoutes);

// 4. Default Route
app.get('/', (req, res) => {
  res.send('POS Backend Server is Running...');
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

// Save models for global access if needed
app.set('models', models);