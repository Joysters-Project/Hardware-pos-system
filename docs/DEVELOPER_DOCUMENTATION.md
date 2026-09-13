# Hardware Point-of-Sale System

## Developer Documentation

**Project:** Hardware Point-of-Sale (POS) and Business Management System  
**Repository:** `HARDWARE-POINT-OF-SALE-SYSTEM`  
**Document type:** Developer / technical documentation  
**Audience:** Developers, maintainers, and project evaluators  
**Version:** 1.0.0  

---

## 1. Purpose of this document

This document describes how the Hardware POS system is built, how to set it up locally, how the backend and frontend are structured, and how to extend, test, and deploy the application.

It is the primary technical reference for:

- installing and running the full stack
- understanding architecture, roles, and data flow
- locating APIs, models, pages, and services
- running automated tests
- deploying frontend and backend

User-facing feature summaries live in the root [README.md](../README.md). Backend and frontend setup notes also exist in [server/README.md](../server/README.md) and [client/README.md](../client/README.md). This file is the combined developer submission document.

---

## 2. System overview

The application is a full-stack, role-based POS and operations platform for a hardware retail store (Mathumithan Hardware). It supports daily counter sales plus inventory, procurement, HR, payroll, projects, and reporting.

### 2.1 What the system does

| Area | Capability |
|---|---|
| Authentication | Username/password login by role, JWT sessions, account lock/unlock, email OTP password reset |
| Cashier POS | Product search, cart, discounts, checkout, receipts, due collection, cheque exchange, returns |
| Inventory | Product catalog, categories, brands, units, multi-unit selling, batch/FEFO stock, low-stock and expiry alerts |
| Procurement | Suppliers, purchase orders, supplier payments, auto-reorder, demand forecast, procurement reports |
| Returns | Customer returns, condition tagging, supplier repair/exchange tracking |
| People & HR | Departments, employees, user accounts, salary records and payment history |
| Finance ops | Assets, expenses, projects with line items, customer cheques |
| Governance | Role-based UI access, audit logs, dashboards, PDF reports |
| Real-time | Socket.IO push for alerts and dashboard-style updates |
| Automation | Daily cron jobs for forecasts, reorder suggestions, overdue payments, cheque and salary reminders |

### 2.2 User roles

| Role | Typical access |
|---|---|
| **Admin** | All modules, including audit logs and user unlock |
| **Manager** | Inventory, procurement, reports, HR/payroll, alerts |
| **Cashier** | Billing, due collection, returns, receipts, product lookup |

Frontend routes are wrapped in `ProtectedRoute`. Backend routes that mutate sales, payments, returns, and dashboards require a JWT. Fine-grained role checks use `roleGuard`.

---

## 3. Architecture

### 3.1 High-level architecture

```
┌─────────────────────────┐         REST / JSON          ┌──────────────────────────┐
│  React 19 + Vite SPA    │  ─────────────────────────►  │  Express 5 API           │
│  (client/, port 5173)   │  Authorization: Bearer JWT   │  (server/, port 5000)    │
│                         │  ◄─────────────────────────  │                          │
│  React Router           │         Socket.IO            │  Controllers / Services  │
│  AuthContext            │                              │  Sequelize ORM           │
│  Axios + TanStack Query │                              │  node-cron               │
└─────────────────────────┘                              └────────────┬─────────────┘
                                                                     │
                                                                     ▼
                                                          ┌──────────────────────────┐
                                                          │  MySQL 8+                │
                                                          │  pos_database            │
                                                          └──────────────────────────┘
```

### 3.2 Request flow

1. The cashier (or admin/manager) opens `http://localhost:5173`.
2. Vite proxies `/api` and `/socket.io` to `VITE_API_URL` (default `http://localhost:5000`), so the browser can call `/api/...` without CORS issues in development.
3. Login (`POST /api/auth/login`) returns a JWT. The client stores it in `sessionStorage` and attaches `Authorization: Bearer <token>` on later Axios calls.
4. Express middleware verifies the token and may apply `roleGuard`.
5. Controllers call Sequelize models and/or domain services (billing, returns, procurement, alerts).
6. Stock-sensitive operations (checkout, returns) run inside database transactions.
7. Socket.IO and cron jobs push or generate alerts independently of the request cycle.

### 3.3 Layering (backend)

| Layer | Location | Responsibility |
|---|---|---|
| Entry | `server/index.js` | HTTP server, CORS, JSON body, Socket.IO, route mount, cron, DB sync |
| Routes | `server/routes/` | HTTP method + path mapping |
| Middleware | `server/middleware/` | JWT auth, role checks |
| Controllers | `server/controllers/` | Request validation, response shape |
| Services | `server/services/` | Business rules (billing, returns, forecast, payments, PDF, audit) |
| Models | `server/models/` | Sequelize entities and associations |
| Schema scripts | `server/scripts/`, `server/migrations/` | Additive schema patches and Sequelize migrations |

### 3.4 Layering (frontend)

| Layer | Location | Responsibility |
|---|---|---|
| Entry | `client/src/main.jsx`, `App.jsx` | Providers, router, toast, React Query |
| Auth | `client/src/context/AuthContext.jsx` | Session restore, login/logout, role |
| Routing guard | `client/src/components/ProtectedRoute.jsx` | Redirect unauthenticated / wrong-role users |
| Pages | `client/src/pages/` | Screen-level views |
| Feature UI | `client/src/components/` | Billing, cashier workspace, procurement workspace, layout |
| HTTP | `client/src/utils/axios.js`, `client/src/api/` | Axios instance with JWT interceptor |
| Domain helpers | `client/src/services/`, `client/src/utils/` | API wrappers and formatters |

---

## 4. Technology stack

### 4.1 Backend (`/server`)

| Technology | Use |
|---|---|
| Node.js 18+ | Runtime |
| Express 5 | REST API |
| Sequelize + mysql2 | ORM and MySQL driver |
| JWT (`jsonwebtoken`) | Access tokens |
| bcrypt | Password hashing |
| Socket.IO 4 | Real-time events |
| node-cron | Scheduled jobs |
| Nodemailer | Gmail SMTP (OTP / mail) |
| Multer | File uploads (`/uploads`) |
| PDFKit | Server-side PDFs |
| dotenv | Environment configuration |

### 4.2 Frontend (`/client`)

| Technology | Use |
|---|---|
| React 19 + Vite 7 | SPA |
| React Router DOM 7 | Client routing |
| Axios | HTTP client |
| TanStack Query | Server-state caching |
| Redux + Thunk | Additional global state where used |
| Socket.IO client | Live updates |
| Recharts | Charts |
| jsPDF + html2canvas | Client PDF / print |
| react-hot-toast | Notifications |
| Radix UI + Lucide | UI primitives and icons |

### 4.3 Testing

| Tool | Scope |
|---|---|
| Playwright (`client/`) | Inventory, procurement, people E2E (authenticated admin session) |
| Playwright (repo root `tests/`) | Cashier billing, due collection, returns |

---

## 5. Repository layout

```
HARDWARE-POINT-OF-SALE-SYSTEM/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/            # Extra API helpers
│   │   ├── components/     # Shared + module UI (billing, cashier, procurement)
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Route screens
│   │   ├── services/       # Frontend API services
│   │   ├── utils/          # Axios, auth helpers, validators
│   │   ├── App.jsx         # Route table
│   │   └── main.jsx
│   ├── tests/              # Playwright: inventory, procurement, people
│   ├── playwright.config.js
│   └── vite.config.js      # Dev proxy for /api and /socket.io
├── server/                 # Express API
│   ├── config/             # Sequelize CLI / DB config
│   ├── controllers/
│   ├── cron/
│   ├── middleware/
│   ├── migrations/
│   ├── models/
│   ├── routes/
│   ├── scripts/            # Startup schema ensure + default users
│   ├── seeders/
│   ├── services/
│   ├── uploads/
│   ├── utils/
│   └── index.js
├── tests/                  # Playwright: cashier POS flows
├── docs/                   # This documentation
├── playwright.config.js    # Root cashier test config
├── vercel.json             # SPA rewrite for frontend hosting
└── README.md
```

---

## 6. Local development setup

### 6.1 Prerequisites

- Node.js **>= 18**
- npm **>= 9**
- MySQL **>= 8**
- Git

Create a MySQL database (example name: `pos_database`).

### 6.2 Clone

```bash
git clone https://github.com/Joysters-Project/Hardware-pos-system.git
cd HARDWARE-POINT-OF-SALE-SYSTEM
```

### 6.3 Backend environment

Create `server/.env` (there is no committed `.env.example`; copy the block below):

```env
PORT=5000
JWT_SECRET=replace_with_a_long_random_string

MYSQLHOST=localhost
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=your_mysql_password
MYSQLDATABASE=pos_database

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

Optional connection-string alternatives (used by `server/models/index.js`):

- `MYSQL_URL`
- `MYSQL_PUBLIC_URL`
- `DATABASE_URL`

Optional default-account overrides:

- `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_MANAGER_USERNAME` / `DEFAULT_MANAGER_PASSWORD`
- `DEFAULT_CASHIER_USERNAME` / `DEFAULT_CASHIER_PASSWORD`

**Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords. Required only for forgot-password OTP.

### 6.4 Start the API

```bash
cd server
npm install
npm run dev
```

- Development: `nodemon index.js` (`npm run dev`)
- Production-style: `node index.js` (`npm start`)
- Base URL: `http://localhost:5000`
- Health: `GET /health` → `{ "status": "ok", "uptime": <seconds> }`

On first successful DB connect the server:

1. runs `sequelize.sync({ force: false })` (creates missing tables, never drops them)
2. applies additive `ensure*.js` schema patches
3. seeds default Admin / Manager / Cashier users
4. starts the near-expiry cron

### 6.5 Frontend environment

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### 6.6 Start the UI

```bash
cd client
npm install
npm run dev
```

App URL: **http://localhost:5173**

### 6.7 Default login accounts

These are created automatically by `server/scripts/seedDefaultAdmin.js` if they do not already exist.

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| Manager | `manager` | `Manager@123` |
| Cashier | `cashier` | `Cashier@123` |

Login path: choose a role at `/`, then `/login/:role` (for example `/login/cashier`). Credentials are **username + password**, not email.

Change these passwords in any shared or production environment.

---

## 7. Authentication and authorization

### 7.1 Login sequence

1. Client posts `{ user_name, password, role }` to `POST /api/auth/login`.
2. Server looks up the user, verifies bcrypt hash, checks lock status and role.
3. Server returns a JWT containing user identity and role.
4. `AuthContext.login()` stores `token`, `role`, and `userName` in `sessionStorage`.
5. Axios interceptor attaches the token on every `/api` request.
6. `401` responses clear storage and dispatch an `unauthorized` event.

### 7.2 Auth API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/signup` | Public | Simple registration |
| POST | `/api/auth/logout` | Public (user id in body) | Logout + audit |
| POST | `/api/auth/unlock` | Admin JWT | Unlock a locked account |
| POST | `/api/auth/send-otp` | Public | Send password-reset OTP |
| POST | `/api/auth/verify-otp` | Public | Verify OTP, return reset token |
| POST | `/api/auth/reset-password` | Public | Set new password |

### 7.3 Backend guards

- `server/middleware/authMiddleware.js` — requires `Authorization: Bearer <jwt>`
- `server/middleware/roleGuard.js` — allows only listed roles (case-insensitive)

Routes mounted with `authMiddleware` in `server/index.js` include bills, payments, returns, supplier-services, and dashboard.

### 7.4 Frontend guards

`ProtectedRoute` behaviour:

- not authenticated → `/login/{role}`
- `requiredRole` mismatch → login for that role
- `blockedRoles` (cashiers on procurement) → that user’s dashboard

JWT payload is treated as the source of role on the API; UI role is also stored in session for routing.

---

## 8. Database design

### 8.1 Engine and sync policy

- Engine: MySQL 8+
- ORM: Sequelize (CommonJS)
- Timezone in Sequelize config: `+05:30`
- Sync: `{ force: false }` — **never** use `force: true` against a shared database
- Extra columns/tables: `server/scripts/ensure*.js` on startup, plus files under `server/migrations/`

### 8.2 Core entities (38 models)

`users`, `employees`, `departments`, `products`, `suppliers`, `customers`, `bills`, `bill_items`, `payments`, `returns`, `return_items`, `supplier_services`, `purchase_orders`, `po_items`, `supplier_payments`, `supplier_payment_transactions`, `supplier_documents`, `supplier_returns`, `brands`, `category`, `units`, `product_units`, `product_warranties`, `batch_inventory`, `inventory_statuses`, `assets`, `expenses`, `salary_payments`, `projects`, `project_items`, `alerts`, `audit_log`, `auto_reorder_suggestions`, `procurement_notifications`, `email_logs`, `cheque_customers`, `customer_cheques`

### 8.3 Important relationships

Defined in `server/models/index.js`:

- Department → Employees → Users → Audit log
- Category / Brand / Unit → Products → Alerts, product units, warranties, inventory status
- Customer + User → Bills → Bill items + Payments + Returns
- Returns → Return items → Supplier services
- Products → Batch inventory (FEFO deduction on sale)
- Suppliers → Purchase orders / PO items / supplier payments
- Projects → Project items
- Cheque customers → Customer cheques

### 8.4 Sales integrity

`BillingService.createInvoice` runs in a Sequelize transaction:

- create/find customer (Sri Lankan phone validation)
- insert bill and line items
- deduct stock using FEFO batches
- record payment
- write audit log
- refresh product alerts

Do not bypass this service for checkout if you need stock and audit consistency.

---

## 9. API reference

All REST routes are prefixed with `/api/`. JSON request/response. File uploads use multipart via Multer and are served from `/uploads`.

### 9.1 Module prefixes

| Prefix | Domain | Notes |
|---|---|---|
| `/api/auth` | Authentication | See §7.2 |
| `/api/users` | User administration | |
| `/api/profile` | Current user profile | |
| `/api/departments` | Departments | |
| `/api/employees` | Employees | |
| `/api/category` | Product categories | |
| `/api/brands` | Brands | |
| `/api/units` | Units of measure | |
| `/api/products` | Product catalog | |
| `/api/suppliers` | Supplier CRUD | |
| `/api/customers` | Customers | |
| `/api/bills` | Sales invoices | JWT required |
| `/api/bill_items` | Invoice lines | |
| `/api/payments` | Customer payments / dues | JWT required |
| `/api/returns` | Customer returns | JWT required |
| `/api/supplier-services` | Repair/exchange jobs | JWT required |
| `/api/alerts` | Stock / expiry alerts | |
| `/api/purchase_orders` | Basic POs | |
| `/api/po_items` | PO lines | |
| `/api/assets` | Fixed assets | |
| `/api/expenses` | Expenses | |
| `/api/salary` | Payroll | |
| `/api/projects` | Projects | |
| `/api/audit_log` | Activity trail | |
| `/api/batch-inventory` | Batches | |
| `/api/cheque-exchange` | Customer cheques | |
| `/api/dashboard` | KPI payloads | JWT required |
| `/api/schema` | Schema inspection (internal) | |

### 9.2 Procurement prefixes

| Prefix | Domain |
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

Legacy aliases also exist: `/api/RR_suppliers`, `/api/RR_purchase_orders`.

### 9.3 Adding a new endpoint (checklist)

1. Add or extend a model under `server/models/` and register it in `models/index.js`.
2. Put business rules in `server/services/` when the operation spans tables or transactions.
3. Create a controller and a router file.
4. Mount the router in `server/index.js` with the correct middleware.
5. Add a frontend Axios call and page/route.
6. Cover the happy path with Playwright if the feature is user-facing.

---

## 10. Frontend routes

Defined in `client/src/App.jsx`.

### 10.1 Public

| Path | Screen |
|---|---|
| `/` | Role selection |
| `/login/:role` | Login |
| `/signup` | Signup |
| `/forgot-password` | OTP reset UI |

### 10.2 Dashboards

| Path | Role |
|---|---|
| `/dashboard/admin` | Admin |
| `/dashboard/manager` | Manager |
| `/dashboard/cashier` | Cashier |

### 10.3 Cashier workspace (`/cashier-panel/...`)

Nested under `CashierWorkspace` + `DashboardLayout`:

| Path | Feature |
|---|---|
| `/cashier-panel/billing` | POS billing |
| `/cashier-panel/due-collection` | Outstanding dues |
| `/cashier-panel/cheque-exchange` | Customer cheques |
| `/cashier-panel/returns/process` | Process a return |
| `/cashier-panel/returns/history` | Return list |
| `/cashier-panel/returns/supplier-services` | Supplier repair/exchange |
| `/cashier-panel/returns/inventory` | Return inventory |
| `/cashier-panel/receipts` | Receipts |
| `/cashier-panel/reports` | Reports |

Legacy paths (`/billing`, `/due-collection`, `/receipts`, `/returns`) redirect into this workspace so the cashier top nav stays consistent.

### 10.4 Procurement workspace (`/procurement/...`)

Cashiers are blocked. Nested routes include suppliers, orders, payments, analytics, forecast, reports, and notifications.

### 10.5 Shared / role-prefixed pages

Many manager screens are duplicated under `/manager/...` so the manager layout and role check stay explicit (products, employees, departments, assets, expenses, salary, alerts, batch inventory, cheque exchange, projects).

Admin-only: `/audit-logs`. All authenticated users: `/profile`.

---

## 11. Key module workflows

### 11.1 POS checkout

1. Cashier searches products (`billingSystem.jsx`).
2. Cart holds quantity, unit, discount, and customer (walk-in or named).
3. Checkout calls the bills API; `BillingService` writes bill, items, payment, FEFO stock deduction, and audit.
4. Receipt can be printed/exported (jsPDF / html2canvas on the client).

### 11.2 Due collection

Partial payments leave a due balance on the bill/customer. `DueCollection.jsx` lists dues and records follow-up payments through `/api/payments`.

### 11.3 Returns and supplier services

1. Cashier/manager looks up the original bill.
2. Return items are recorded with condition.
3. Repair/exchange items create `supplier_services` with status lifecycle **PENDING → SENT → COMPLETED**.

### 11.4 Procurement loop

1. Forecast and auto-reorder crons suggest replenishment.
2. Manager creates a purchase order.
3. Goods receipt updates inventory/batches.
4. Supplier invoices and payments are tracked; overdue invoices are marked daily at 08:00.

### 11.5 Alerts

- Low stock and near-expiry alerts are stored in `alerts`.
- `cron/nearExpiryCron.js` generates expiry alerts.
- Product sync after sales uses `alertService`.
- UI: `/alerts` and notification bell.

---

## 12. Real-time and scheduled jobs

### 12.1 Socket.IO

Created in `server/index.js` and attached to the Express app (`app.set('io', io)`). CORS origin is open (`*`) for development. The Vite proxy forwards `/socket.io` with `ws: true`.

Use `req.app.get('io')` (or the `io` instance passed into services) to emit events such as cheque due alerts.

### 12.2 Cron schedule (server local time)

| Time | Job |
|---|---|
| 06:00 | Recalculate supplier performance |
| 06:30 | Recalculate product demand forecasts |
| 07:00 | Generate auto-reorder suggestions |
| 07:30 | Cheque due/overdue alerts (within 7 days) |
| 08:00 | Mark overdue supplier payments; salary reminder in last 5 days of month |
| Configurable | Near-expiry alert generation |

Cron runs **inside the API process**. Run a single production instance of the API unless you add distributed locking.

---

## 13. Testing

### 13.1 Prerequisites for E2E

- Backend running on port **5000** with a populated database
- Frontend running on port **5173**
- Default seeded users available (`admin` / `cashier`)
- Playwright browsers installed (`npx playwright install` if needed)

### 13.2 Frontend module tests (`client/`)

Config: `client/playwright.config.js`

Projects:

1. `auth-setup` — logs in as Admin (`admin` / `Admin@123`) and writes `client/tests/auth/.auth-state.json`
2. `inventory` — catalog, products, batches, assets
3. `procurement` — suppliers, POs, payments, forecast, reports
4. `people` — employees and departments

Serial workers (`workers: 1`) because tests share database state.

```bash
cd client
npx playwright test
npx playwright test --ui
```

Helpers restore `sessionStorage` from Playwright storage state because `AuthContext` reads session storage, not cookies.

### 13.3 Cashier tests (repo root)

Config: `playwright.config.js`  
Specs: `tests/cashier/`

Coverage includes:

- billing search, cart, customer, discount, checkout
- billing inventory E2E
- due checking and due collection
- process return

Root `package.json`:

```bash
npm test
```

`pretest` runs `server/seeders/20230910-insert-test-invoice.js` so cashier specs have a known invoice.

Helpers live in:

- `tests/cashier/billing/billing.helpers.js`
- `tests/cashier/due-collection/due.helpers.js`
- `tests/cashier/returns/returns.helpers.js`

On Windows, WebKit cannot resolve `localhost`; helpers switch to `127.0.0.1` for that browser.

### 13.4 Backend unit-style tests

Additional files exist under `server/test/` (for example department controller and supplier PDF). They are not wired to `server` `npm test` (that script currently exits with “no test specified”). Prefer Playwright for user-visible behaviour.

---

## 14. Coding conventions

- **Backend:** CommonJS (`require` / `module.exports`). One router and one controller per domain. Keep multi-table rules in `services/`.
- **Frontend:** ES modules. Pages in `pages/`, reusable widgets in `components/`. Prefer the shared Axios instance so JWT handling stays in one place.
- **IDs and money:** persist numeric IDs from the API; format currency only in the UI.
- **Do not commit** `.env`, credentials, or `uploads/` user files.
- **Schema:** additive only. Prefer a new `ensure*.js` or migration over destructive sync.
- **Auth:** never log raw passwords or OTP values.
- **UI roles:** if a screen is cashier-only or admin-only, set `requiredRole` or `blockedRoles` on the route **and** enforce the same rule on the API.

---

## 15. Deployment

### 15.1 Frontend (Vercel)

- Root directory: `client/`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-backend-host`
- SPA fallback: repo-root `vercel.json` rewrites `/(.*)` → `/index.html`

`VITE_*` variables are baked in at **build time**. Rebuild after changing the API URL.

### 15.2 Backend (Railway, Render, or VPS)

- Start command: `npm start` (from `server/`)
- Set the same variables as in §6.3
- Point `FRONTEND_URL` at the deployed SPA origin
- MySQL must be reachable from the host (or use `MYSQL_URL`)
- Persist `server/uploads` if profile photos / documents must survive deploys
- Use a strong unique `JWT_SECRET`

### 15.3 Production checklist

- [ ] Default passwords changed or default seed disabled
- [ ] SMTP configured if password reset is required
- [ ] CORS / `FRONTEND_URL` match the real UI origin (tighten Socket.IO origin if needed)
- [ ] HTTPS on both UI and API
- [ ] Database backups enabled
- [ ] Single API instance for cron, or an external scheduler

---

## 16. Troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| API never becomes healthy | MySQL connection | Host, port, user, database name in `server/.env`; server log `[Sequelize] Connecting to DB` |
| UI loads but all API calls fail | Wrong `VITE_API_URL` or API down | `GET http://localhost:5000/health`; Vite proxy in `vite.config.js` |
| Immediate redirect to login | Missing session | `sessionStorage` keys `token`, `role`, `userName` |
| 401 on bills/payments/returns | Token missing or expired | Axios interceptor; login again |
| 403 insufficient permission | Role mismatch | JWT `role` vs `roleGuard` list |
| OTP email not sent | SMTP | `SMTP_EMAIL` / `SMTP_PASSWORD` app password |
| Playwright auth setup fails | UI/API not running or seed missing | Ports 5173 and 5000; default `admin` user |
| Stock wrong after sale | Checkout bypassed billing service | Use `BillingService`; inspect `batch_inventory` |
| Duplicate cron effects | Multiple API processes | Run one worker for scheduled jobs |

---

## 17. How to extend the system (examples)

**New report:** add a service that queries Sequelize, a GET route under `/api/.../reports`, and a page that calls it and optionally exports PDF.

**New cashier tab:** add a nested route under `/cashier-panel` in `App.jsx` and a link in `CashierWorkspace`.

**New product field:** add column via `ensure*.js` or migration, expose it on the product model and controller, then update `ProductForm` / catalog table.

**New Socket event:** emit from the service after commit, subscribe in the relevant page or layout, invalidate React Query caches on message.

---

## 18. Document history

| Version | Date | Notes |
|---|---|---|
| 1.0.0 | 2026-09-10 | Initial developer documentation for project submission |

---

## 19. Related files

| File | Contents |
|---|---|
| [README.md](../README.md) | Product overview and quick start |
| [server/README.md](../server/README.md) | API env vars, route list, cron |
| [client/README.md](../client/README.md) | Frontend env, pages, Vercel |
| `server/index.js` | Runtime composition |
| `client/src/App.jsx` | Full route map |
| `server/models/index.js` | Associations |
