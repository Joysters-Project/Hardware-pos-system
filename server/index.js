require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models'); // Import from models/index.js (the standard way)

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middleware
app.use(cors());
app.use(express.json());

// 2. Database Sync (Using the imported sequelize instance)
// Avoid automatic schema alterations in production / existing DBs.
sequelize.sync()
  .then(() => console.log('✅ Database synced successfully'))
  .catch((err) => console.error('❌ Database sync failed:', err.message));

// 3. Import All Routes (Combined from Developer and POS Head)
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

// 4. Register API Routes
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
app.use('/api/bills', billRoutes); // This covers your Sales/POS logic
app.use('/api/bill_items', billItemsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/purchase_orders', purchaseOrderRoutes);
app.use('/api/po_items', poItemsRoutes);

// 5. Default Route
app.get('/', (req, res) => {
  res.send('Mathumithan Hardware POS Backend is Running...');
});

// 6. Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 7. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});