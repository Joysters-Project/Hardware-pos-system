require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

//1. just require the DB object
// These files rely on the .env variables being ready
const db = require('./models');// This automatically looks for models/index.js
const authRoutes = require('./routes/auth'); // Path to your routes/auth.js file
const seedDefaultAdmin = require('./scripts/seedDefaultAdmin');
const ensureSupplierSchema = require('./scripts/ensureSupplierSchema');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible from controllers via app
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Socket client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Socket client disconnected:', socket.id));
});

// 2. Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Database Sync
// Using { force: false } — never mutate schema on startup.
// All schema changes are handled by Sequelize CLI migrations (npx sequelize-cli db:migrate).
db.sequelize.sync({ force: false })
  .then(async () => {
    console.log('✅ Database connected successfully');
    await ensureSupplierSchema();
    await seedDefaultAdmin();
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
const RR_supplierRoutes         = require('./routes/RR_supplierRoutes');
const RR_purchaseOrderRoutes    = require('./routes/RR_purchaseOrderRoutes');
const procurementDashboardRoutes = require('./routes/procurementDashboardRoutes');
const procurementReportsRoutes   = require('./routes/procurementReportsRoutes');
const procurementPaymentRoutes   = require('./routes/procurementPaymentRoutes');
const autoReorderRoutes          = require('./routes/autoReorderRoutes');
const forecastRoutes             = require('./routes/forecastRoutes');
const procurementNotificationRoutes = require('./routes/procurementNotificationRoutes');
const supplierPerformanceRoutes  = require('./routes/supplierPerformanceRoutes');
const cron         = require('node-cron');

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
app.use('/api/assets', assetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/salary', salaryRoutes);

// Procurement Module
app.use('/api/procurement/suppliers',       RR_supplierRoutes);
app.use('/api/procurement/purchase-orders', RR_purchaseOrderRoutes);
app.use('/api/procurement/dashboard',       procurementDashboardRoutes);
app.use('/api/procurement/reports',         procurementReportsRoutes);
app.use('/api/procurement/payments',        procurementPaymentRoutes);
app.use('/api/procurement/reorder',         autoReorderRoutes);
app.use('/api/procurement/forecast',        forecastRoutes);
app.use('/api/procurement/notifications',   procurementNotificationRoutes);
app.use('/api/procurement/performance',     supplierPerformanceRoutes);

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

// Daily 07:00 — Check all products for auto-reorder suggestions
cron.schedule('0 7 * * *', async () => {
  try {
    const autoReorderService = require('./services/autoReorderService');
    const count = await autoReorderService.checkAndGenerateSuggestions();
    console.log(`[Cron] Daily auto-reorder check generated ${count} suggestions.`);
  } catch (e) {
    console.error('[Cron] Auto-reorder check error:', e.message);
  }
});

// Daily 08:00 — Mark overdue payments
cron.schedule('0 8 * * *', async () => {
  try {
    const paymentService = require('./services/supplierPaymentService');
    const count = await paymentService.checkAndMarkOverdue();
    console.log(`[Cron] Daily overdue payment check marked ${count} invoices overdue.`);
  } catch (e) {
    console.error('[Cron] Overdue payment check error:', e.message);
  }
});

// Daily 06:00 — Recalculate supplier performance scores
cron.schedule('0 6 * * *', async () => {
  try {
    const performanceService = require('./services/supplierPerformanceService');
    const count = await performanceService.recalculateAllSuppliers();
    console.log(`[Cron] Daily supplier performance score update completed for ${count} suppliers.`);
  } catch (e) {
    console.error('[Cron] Supplier performance recalculation error:', e.message);
  }
});

// Daily 06:30 — Recalculate product forecasts
cron.schedule('30 6 * * *', async () => {
  try {
    const forecastService = require('./services/forecastService');
    const list = await forecastService.calculateForecasts();
    console.log(`[Cron] Daily forecast calculations updated for ${list.length} products.`);
  } catch (e) {
    console.error('[Cron] Forecast calculation error:', e.message);
  }
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
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

// Save models for global access if needed
app.set('models', db);
