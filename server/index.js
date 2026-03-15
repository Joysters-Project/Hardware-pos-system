require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models'); // This automatically looks for models/index.js

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middleware
app.use(cors()); // Allows React to talk to this server
app.use(express.json()); // Allows server to read JSON from requests

// 2. Database Sync
// This ensures all 17 tables from your models folder are ready in MySQL
db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced successfully');
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err.message);
  });

// 3. API Routes (Assignments for your team)
// Member B's Product API
// const productRoutes = require('./routes/productRoutes');
// app.use('/api/products', productRoutes);

// 4. API Routes
app.use('/api/sales', require('./routes/billRoutes'));

// 5. Default Route
app.get('/', (req, res) => {
  res.send('POS Backend Server is Running...');
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

const billRoutes = require('./routes/billRoutes');
app.use('/api/bills', billRoutes);