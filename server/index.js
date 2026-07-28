require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const http    = require('http');
const { Server } = require('socket.io');
const cron    = require('node-cron');

const db               = require('./models');
const authRoutes       = require('./routes/auth');
const authMiddleware   = require('./middleware/authMiddleware');
const seedDefaultAdmin = require('./scripts/seedDefaultAdmin');
const ensureSupplierSchema = require('./scripts/ensureSupplierSchema');
const ensureMultiUnitSchema = require('./scripts/ensureMultiUnitSchema');
const ensureReturnSchema = require('./scripts/ensureReturnSchema');
const { startNearExpiryCron } = require('./cron/nearExpiryCron');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.set('io', io);
io.on('connection', (socket) => {
  console.log('🔌 Socket client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Socket client disconnected:', socket.id));
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database Sync ─────────────────────────────────────────────────────────────
db.sequelize.sync({ force: false })
  .then(async () => {
    console.log('✅ Database connected successfully');
    await ensureSupplierSchema();
    await ensureMultiUnitSchema();
    await ensureReturnSchema();
    await seedDefaultAdmin();
    startNearExpiryCron();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

const departmentRoutes   = require('./routes/departmentRoutes');
const employeeRoutes     = require('./routes/employeeRoutes');
const userRoutes         = require('./routes/userRoutes');
const profileRoutes      = require('./routes/profileRoutes');
const auditLogRoutes     = require('./routes/auditLogRoutes');
const categoryRoutes     = require('./routes/categoryRoutes');
const brandRoutes        = require('./routes/brandRoutes');
const unitRoutes         = require('./routes/unitRoutes');
const productRoutes      = require('./routes/productRoutes');
const supplierRoutes     = require('./routes/supplierRoutes');
const customerRoutes     = require('./routes/customerRoutes');
const billRoutes         = require('./routes/billRoutes');
const billItemsRoutes    = require('./routes/billItemsRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const returnRoutes       = require('./routes/returnRoutes');
const supplierServiceRoutes = require('./routes/supplierServiceRoutes');
const alertRoutes        = require('./routes/alertRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const poItemsRoutes      = require('./routes/poItemsRoutes');
const schemaRoutes       = require('./routes/schemaRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const assetRoutes        = require('./routes/assetRoutes');
const expenseRoutes      = require('./routes/expenseRoutes');
const salaryRoutes       = require('./routes/salaryRoutes');
const RR_supplierRoutes              = require('./routes/RR_supplierRoutes');
const RR_purchaseOrderRoutes         = require('./routes/RR_purchaseOrderRoutes');
const procurementDashboardRoutes     = require('./routes/procurementDashboardRoutes');
const procurementReportsRoutes       = require('./routes/procurementReportsRoutes');
const procurementPaymentRoutes       = require('./routes/procurementPaymentRoutes');
const autoReorderRoutes              = require('./routes/autoReorderRoutes');
const forecastRoutes                 = require('./routes/forecastRoutes');
const procurementNotificationRoutes  = require('./routes/procurementNotificationRoutes');
const supplierPerformanceRoutes      = require('./routes/supplierPerformanceRoutes');

app.use('/api/departments',    departmentRoutes);
app.use('/api/employees',      employeeRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/profile',        profileRoutes);
app.use('/api/audit_log',      auditLogRoutes);
app.use('/api/category',       categoryRoutes);
app.use('/api/brands',         brandRoutes);
app.use('/api/units',          unitRoutes);
app.use('/api/products',       productRoutes);
app.use('/api/suppliers',      supplierRoutes);
app.use('/api/customers',      customerRoutes);
app.use('/api/bills',          authMiddleware, billRoutes);
app.use('/api/bill_items',     billItemsRoutes);
app.use('/api/payments',       authMiddleware, paymentRoutes);
app.use('/api/returns',        authMiddleware, returnRoutes);
app.use('/api/supplier-services', authMiddleware, supplierServiceRoutes);
app.use('/api/alerts',         alertRoutes);
app.use('/api/purchase_orders', purchaseOrderRoutes);
app.use('/api/po_items',       poItemsRoutes);
app.use('/api/schema',         schemaRoutes);
app.use('/api/dashboard',      authMiddleware, dashboardRoutes);
app.use('/api/assets',         assetRoutes);
app.use('/api/expenses',       expenseRoutes);
app.use('/api/salary',         salaryRoutes);

// Procurement module
app.use('/api/procurement/suppliers',       RR_supplierRoutes);
app.use('/api/procurement/purchase-orders', RR_purchaseOrderRoutes);
app.use('/api/procurement/dashboard',       procurementDashboardRoutes);
app.use('/api/procurement/reports',         procurementReportsRoutes);
app.use('/api/procurement/payments',        procurementPaymentRoutes);
app.use('/api/procurement/reorder',         autoReorderRoutes);
app.use('/api/procurement/forecast',        forecastRoutes);
app.use('/api/procurement/notifications',   procurementNotificationRoutes);
app.use('/api/procurement/performance',     supplierPerformanceRoutes);
app.use('/api/RR_suppliers',        RR_supplierRoutes);
app.use('/api/RR_purchase_orders',  RR_purchaseOrderRoutes);

// ── Cron Jobs (each schedule registered once) ─────────────────────────────────

// Daily 06:00 — Recalculate supplier performance scores
cron.schedule('0 6 * * *', async () => {
  try {
    const svc = require('./services/supplierPerformanceService');
    const count = await svc.recalculateAllSuppliers();
    console.log(`[Cron] Supplier performance updated for ${count} suppliers.`);
  } catch (e) { console.error('[Cron] Supplier performance error:', e.message); }
});

// Daily 06:30 — Recalculate product forecasts
cron.schedule('30 6 * * *', async () => {
  try {
    const svc = require('./services/forecastService');
    const list = await svc.calculateForecasts();
    console.log(`[Cron] Forecasts updated for ${list.length} products.`);
  } catch (e) { console.error('[Cron] Forecast error:', e.message); }
});

// Daily 07:00 — Auto-reorder suggestions
cron.schedule('0 7 * * *', async () => {
  try {
    const svc = require('./services/autoReorderService');
    const count = await svc.checkAndGenerateSuggestions();
    console.log(`[Cron] Auto-reorder generated ${count} suggestions.`);
  } catch (e) { console.error('[Cron] Auto-reorder error:', e.message); }
});

// Daily 08:00 — Mark overdue payments + salary reminder
cron.schedule('0 8 * * *', async () => {
  try {
    const paymentSvc = require('./services/supplierPaymentService');
    const count = await paymentSvc.checkAndMarkOverdue();
    console.log(`[Cron] Overdue payment check marked ${count} invoices overdue.`);
  } catch (e) { console.error('[Cron] Overdue payment error:', e.message); }

  try {
    const now      = new Date();
    const dueDay   = 30;
    const daysLeft = dueDay - now.getDate();
    if (daysLeft >= 0 && daysLeft <= 5) {
      const pending = await db.salary_payments.count({ where: { payment_status: 'Pending' } });
      console.log(`🔔 Salary Reminder: ${pending} pending payment(s). Due in ${daysLeft} day(s).`);
    }
  } catch (e) { console.error('[Cron] Salary reminder error:', e.message); }
});

// ── Default & Health Routes ───────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Mathumithan Hardware POS Backend is Running...'));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});

app.set('models', db);
