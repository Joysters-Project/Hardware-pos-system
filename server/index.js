require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import models (which includes sequelize connection)
const db = require('./models');

// Import all routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const userRoutes = require('./routes/userRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const unitRoutes = require('./routes/unitRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const billItemsRoutes = require('./routes/billItemsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const returnRoutes = require('./routes/returnRoutes');
const alertRoutes = require('./routes/alertRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const poItemsRoutes = require('./routes/poItemsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middleware - Configure CORS to allow frontend requests
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
};
app.use(cors(corsOptions)); // Allows React to talk to this server
app.use(express.json()); // Allows server to read JSON from requests

// 2. Database Sync
// This ensures all tables from your models folder are ready in MySQL
db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced successfully');
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err.message);
  });

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit_log', auditLogRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/bill_items', billItemsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/purchase_orders', purchaseOrderRoutes);
app.use('/api/po_items', poItemsRoutes);

// 4. Default Route
app.get('/', (req, res) => {
  res.send('✅ POS Backend Server is Running...');
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

// Save models for global access if needed
app.set('db', db);