const express = require('express');
const cors = require('cors');
const db = require('./models'); // Points to the index.js we just made

const app = express();
app.use(cors());
app.use(express.json());

// Sync Database
// In development, use { alter: true } to update tables without deleting data
db.sequelize.sync({ alter: true })
  .then(() => console.log("✅ Database synced & tables created!"))
  .catch(err => console.log("❌ Sync failed: " + err.message));

// Import Routes (For Member B)
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
