# 🖥️ Backend — Hardware POS System

Node.js + Express REST API server with MySQL (Sequelize ORM), JWT auth, real-time Socket.IO, cron jobs, and email notifications.

---

## 📁 Folder Structure

```
server/
├── config/           # Sequelize database config (config.js)
├── controllers/      # Route handler logic (one file per domain)
├── cron/             # Recurring job definitions (e.g. nearExpiryCron)
├── middleware/       # authMiddleware (JWT verification)
├── migrations/       # Sequelize migration files
├── models/           # Sequelize model definitions + associations (index.js)
├── routes/           # Express router files (one file per domain)
├── scripts/          # One-time startup scripts (schema ensure, seed admin)
├── seeders/          # Sequelize seed files
├── services/         # Business-logic services called by controllers/crons
├── test/ tests/      # Test files
├── uploads/          # Multer file upload storage
├── utils/            # Shared utilities
├── index.js          # App entry point — Express setup, routes, cron, Socket.IO
├── .env              # Environment variables (never commit this)
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `server/` directory with the following keys:

```env
# Server
PORT=5000
JWT_SECRET=your_jwt_secret_here

# MySQL Database
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=your_password
MYSQLDATABASE=pos_database

# Frontend origin (used for CORS / email links)
FRONTEND_URL=http://localhost:5173

# SMTP (Gmail App Password recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App passwords.

---

## 🔌 API Route Reference

All routes are prefixed with `/api/`. Routes marked 🔒 require a valid JWT (`Authorization: Bearer <token>`).

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/forgot-password` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password after OTP |

### Core Modules
| Prefix | Description | Auth |
|---|---|---|
| `/api/users` | User management (Admin) | — |
| `/api/profile` | Logged-in user profile | — |
| `/api/departments` | Department CRUD | — |
| `/api/employees` | Employee CRUD | — |
| `/api/category` | Product categories | — |
| `/api/brands` | Product brands | — |
| `/api/units` | Units of measure | — |
| `/api/products` | Product catalog | — |
| `/api/suppliers` | Supplier CRUD | — |
| `/api/customers` | Customer CRUD | — |
| `/api/bills` | Sales bills | 🔒 |
| `/api/bill_items` | Bill line items | — |
| `/api/payments` | Customer payments | 🔒 |
| `/api/returns` | Customer returns | 🔒 |
| `/api/supplier-services` | Repair/exchange tracking | 🔒 |
| `/api/alerts` | Inventory/expiry alerts | — |
| `/api/purchase_orders` | Purchase orders (basic) | — |
| `/api/po_items` | PO line items | — |
| `/api/assets` | Fixed assets | — |
| `/api/expenses` | Business expenses | — |
| `/api/salary` | Salary records | — |
| `/api/projects` | Project management | — |
| `/api/audit_log` | Audit log viewer | — |
| `/api/batch-inventory` | Batch inventory tracking | — |
| `/api/cheque-exchange` | Customer cheque exchange | — |
| `/api/dashboard` | Dashboard KPIs | 🔒 |
| `/api/schema` | Internal schema inspection | — |

### Procurement Module
| Prefix | Description |
|---|---|
| `/api/procurement/suppliers` | Advanced supplier management |
| `/api/procurement/purchase-orders` | Advanced purchase orders |
| `/api/procurement/dashboard` | Procurement KPIs |
| `/api/procurement/reports` | Procurement reports |
| `/api/procurement/payments` | Supplier payments |
| `/api/procurement/reorder` | Auto-reorder suggestions |
| `/api/procurement/forecast` | Demand forecasting |
| `/api/procurement/notifications` | Procurement notifications |
| `/api/procurement/performance` | Supplier performance scores |

---

## 🗄️ Database

- **Engine**: MySQL 8+
- **ORM**: Sequelize 6 (CommonJS)
- **Sync mode**: `{ force: false }` — tables are created if missing, never dropped
- **Schema patches**: Applied at startup via `scripts/ensure*.js` files (additive `ALTER TABLE` migrations)

### Key Models (38 total)
`users`, `employees`, `departments`, `products`, `suppliers`, `customers`, `bills`, `bill_items`, `payments`, `returns`, `return_items`, `supplier_services`, `purchase_orders`, `po_items`, `supplier_payments`, `supplier_payment_transactions`, `supplier_documents`, `supplier_returns`, `brands`, `category`, `units`, `product_units`, `product_warranties`, `batch_inventory`, `inventory_statuses`, `assets`, `expenses`, `salary_payments`, `projects`, `project_items`, `alerts`, `audit_log`, `auto_reorder_suggestions`, `procurement_notifications`, `email_logs`, `cheque_customers`, `customer_cheques`

---

## ⏰ Scheduled Cron Jobs

| Time (daily) | Task |
|---|---|
| 06:00 | Recalculate supplier performance scores |
| 06:30 | Recalculate product demand forecasts |
| 07:00 | Generate auto-reorder suggestions |
| 08:00 | Mark overdue supplier payments; salary reminder (last 5 days of month) |
| Configurable | Near-expiry alert generation (`cron/nearExpiryCron.js`) |

---

## 🏃 Running the Server

```bash
# Development (hot-reload via nodemon)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000` (or `$PORT`).

Health check: `GET /health` → `{ "status": "ok", "uptime": <seconds> }`

---

## 🌐 Deployment (Railway / Render / VPS)

1. Set all environment variables listed above in your hosting platform's dashboard.
2. Set the start command to `npm start` (runs `node index.js`).
3. Ensure MySQL is accessible from the hosting environment (use `MYSQLHOST` / `MYSQLPORT` vars).
4. For Railway MySQL, use the `MYSQL_URL` connection string instead of individual vars (update `config/config.js` accordingly).

---

## 🔐 Authentication Flow

1. Client sends `POST /api/auth/login` with `{ email, password }`.
2. Server validates credentials and returns a JWT.
3. Client stores the JWT and sends it as `Authorization: Bearer <token>` on protected routes.
4. `middleware/authMiddleware.js` verifies the JWT on each protected request.

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP framework |
| `sequelize` + `mysql2` | ORM + MySQL driver |
| `jsonwebtoken` | JWT generation/verification |
| `bcrypt` / `bcryptjs` | Password hashing |
| `socket.io` | Real-time event push |
| `nodemailer` | Email sending (SMTP) |
| `@getbrevo/brevo` | Brevo (Sendinblue) email SDK |
| `node-cron` | Scheduled background jobs |
| `multer` | File upload handling |
| `pdfkit` | Server-side PDF generation |
| `uuid` | Unique ID generation |
| `axios` | HTTP client (for outbound requests) |
| `dotenv` | Environment variable loading |
