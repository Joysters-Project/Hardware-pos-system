require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
<<<<<<< HEAD
const db = require('./models');
=======

//1. just require the DB object
// These files rely on the .env variables being ready
const db = require('./models');// This automatically looks for models/index.js
const authRoutes = require('./routes/auth'); // Path to your routes/auth.js file
>>>>>>> c0c9f6e5e114c1a07e2770a41b0796c73d67d603
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware
app.use(cors()); // Allows React to talk to this server
app.use(express.json()); // Allows server to read JSON from requests

<<<<<<< HEAD


console.log(process.env.DB_HOST);
console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);
console.log(process.env.DB_NAME);

// 2. Database Sync
=======
// 3. Database Sync
>>>>>>> c0c9f6e5e114c1a07e2770a41b0796c73d67d603
// This ensures all 17 tables from your models folder are ready in MySQL
db.sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Database synced successfully');
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err.message);
  });

// 4. API Routes (Assignments for your team)
app.use('/api/auth',authRoutes);

// 3. Import All Routes (Combined from Developer and POS Head)
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
<<<<<<< HEAD
const RR_supplierRoutes = require('./routes/RR_supplierRoutes');
const RR_purchaseOrderRoutes = require('./routes/RR_purchaseOrderRoutes');
=======
const schemaRoutes = require('./routes/schemaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
>>>>>>> c0c9f6e5e114c1a07e2770a41b0796c73d67d603

// 4. Register API Routes
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
app.use('/api/schema', schemaRoutes);
app.use('/api/dashboard', dashboardRoutes);

<<<<<<< HEAD
// Custom Isolated Procurement Modules
app.use('/api/RR_suppliers', RR_supplierRoutes);
app.use('/api/RR_purchase_orders', RR_purchaseOrderRoutes);

// 4. Default Route
=======
// 5. Default Route
>>>>>>> c0c9f6e5e114c1a07e2770a41b0796c73d67d603
app.get('/', (req, res) => {
  res.send('Mathumithan Hardware POS Backend is Running...');
});

// 6. Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 7. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

// Save models for global access if needed
app.set('models', db);
