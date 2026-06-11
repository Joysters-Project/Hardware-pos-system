require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

//1. just require the DB object
// These files rely on the .env variables being ready
const db = require('./models');// This automatically looks for models/index.js
const authRoutes = require('./routes/auth'); // Path to your routes/auth.js file
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Database Sync
// Using { force: false } — never mutate schema on startup.
// All schema changes are handled by Sequelize CLI migrations (npx sequelize-cli db:migrate).
db.sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// 4. API Routes (Assignments for your team)
app.use('/api/auth',authRoutes);

// 3. Import All Routes (Combined from Developer and POS Head)
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
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
const schemaRoutes = require('./routes/schemaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const assetRoutes  = require('./routes/assetRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const cron         = require('node-cron');

// 4. Register API Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
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
app.use('/api/assets', assetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/salary', salaryRoutes);

// Cron: daily at 08:00 — log pending salary reminders to console
cron.schedule('0 8 * * *', async () => {
  try {
    const now     = new Date();
    const month   = now.getMonth() + 1;
    const year    = now.getFullYear();
    const dueDay  = 30;
    const daysLeft = dueDay - now.getDate();
    if (daysLeft >= 0 && daysLeft <= 5) {
      const db      = require('./models');
      const pending = await db.salary_payments.count({ where: { payment_status: 'Pending' } });
      console.log(`🔔 Salary Reminder: ${pending} pending salary payment(s). Due in ${daysLeft} day(s) (${dueDay}th).`);
    }
  } catch (e) { console.error('Cron error:', e.message); }
});

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
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

// Save models for global access if needed
app.set('models', db);
