# 🔧 Hardware Point-of-Sale System

A full-stack, role-based **Point-of-Sale (POS) and Business Management System** built for hardware retail stores. It covers everything from daily sales and inventory management to procurement, HR, payroll, projects, and financial reporting.

---

## 📁 Repository Structure

```
HARDWARE-POINT-OF-SALE-SYSTEM/
├── client/          # React 19 + Vite frontend
├── server/          # Node.js + Express + Sequelize backend
├── vercel.json      # Vercel SPA rewrite rule (frontend deployment)
└── README.md        # This file
```

---

## ✨ Feature Overview

| Module | Description |
|---|---|
| **Authentication** | JWT-based login, role selection (Admin / Manager / Cashier), forgot-password via email OTP |
| **Dashboard** | Role-specific KPI dashboards with real-time Socket.IO updates |
| **Products & Inventory** | Product catalog, multi-unit support, batch inventory tracking, stock alerts |
| **Sales (POS)** | Bill creation, bill items, payments, receipt printing (PDF) |
| **Returns** | Customer returns workflow, condition tagging, repair/exchange routing |
| **Supplier Services** | Track items sent to suppliers for repair/exchange, status lifecycle (PENDING → SENT → COMPLETED) |
| **Suppliers** | Supplier CRUD, performance scoring, documents |
| **Procurement** | Purchase orders, PO items, supplier payments, payment transactions |
| **Procurement (Advanced)** | Auto-reorder suggestions, demand forecasting, procurement dashboard & reports, notifications |
| **Customers** | Customer CRUD, cheque exchange management |
| **HR / Employees** | Department and employee management, role-based access |
| **Payroll** | Salary management, salary payment history |
| **Projects** | Project lifecycle with line items |
| **Assets & Expenses** | Fixed asset register, business expense tracking |
| **Alerts** | Low-stock and near-expiry alert system with cron automation |
| **Audit Logs** | Full activity audit trail |
| **Reports** | Multi-section PDF/screen reports (sales, procurement, inventory) |

---

## 🛠️ Tech Stack

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express 5
- **ORM**: Sequelize 6 (MySQL)
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.IO 4
- **Email**: Nodemailer (Gmail SMTP) + Brevo SDK
- **Scheduler**: node-cron
- **PDF**: PDFKit
- **File uploads**: Multer

### Frontend (`/client`)
- **Framework**: React 19 + Vite 7
- **Routing**: React Router DOM 7
- **State**: Redux + Redux Thunk + TanStack Query
- **UI Components**: Radix UI, Lucide React icons
- **Animations**: Framer Motion
- **Charts**: Recharts
- **HTTP**: Axios
- **PDF**: jsPDF + html2canvas
- **Notifications**: react-hot-toast

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MySQL >= 8
- npm >= 9

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd HARDWARE-POINT-OF-SALE-SYSTEM
```

### 2. Start the backend
```bash
cd server
npm install
cp .env.example .env   # fill in your values (see server/README.md)
npm run dev
```

### 3. Start the frontend
```bash
cd client
npm install
cp .env.example .env   # fill in your values (see client/README.md)
npm run dev
```

The app will be available at **http://localhost:5173** (proxies API calls to **http://localhost:5000**).

---

## 🌐 Deployment

| Layer | Platform |
|---|---|
| Frontend | Vercel (SPA mode via `vercel.json`) |
| Backend | Any Node-compatible host (Railway, Render, VPS) |
| Database | MySQL (Aiven, Railway, PlanetScale, self-hosted) |

See [server/README.md](./server/README.md) and [client/README.md](./client/README.md) for platform-specific deployment steps.

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Admin** | Full access to all modules |
| **Manager** | Procurement, inventory, reports, HR |
| **Cashier** | POS billing, receipts, product lookup |

---

## 📜 License

ISC
