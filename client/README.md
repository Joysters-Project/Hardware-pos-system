# 🖥️ Frontend — Hardware POS System

React 19 + Vite 7 single-page application. Role-aware, chart-rich UI with real-time Socket.IO updates, PDF export, and a fully proxied API connection to the backend.

---

## 📁 Folder Structure

```
client/
├── public/             # Static assets (favicons, etc.)
├── src/
│   ├── api/            # Axios instance and API helper modules
│   ├── api.jsx         # Base Axios config (base URL, interceptors)
│   ├── assets/         # Images, icons, static media
│   ├── components/     # Reusable UI components
│   ├── context/        # React context providers (auth, theme, etc.)
│   ├── lib/            # Shared utility libraries
│   ├── pages/          # Page-level components (see table below)
│   │   ├── inventory/  # Inventory sub-pages
│   │   ├── procurement/# Procurement sub-pages
│   │   ├── products/   # Product sub-pages
│   │   ├── returns/    # Returns sub-pages
│   │   └── suppliers/  # Supplier sub-pages
│   ├── services/       # API service functions (one file per domain)
│   ├── styles/         # Extra CSS modules / shared styles
│   ├── utils/          # Frontend helpers (formatters, validators, etc.)
│   ├── App.jsx         # Root component with routing
│   ├── App.css         # Global application styles
│   ├── index.css       # Base reset / CSS variables
│   └── main.jsx        # Vite entry point
├── index.html          # HTML shell
├── vite.config.js      # Vite configuration (proxy, aliases)
├── eslint.config.js    # ESLint configuration
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `client/` directory:

```env
# URL of the backend API (used by Vite dev-server proxy and production builds)
VITE_API_URL=http://localhost:5000
```

> In development, Vite proxies all `/api` and `/socket.io` requests to `VITE_API_URL`, so no CORS issues occur locally.

---

## 🗺️ Pages & Routes

| Page Component | Route (approximate) | Role |
|---|---|---|
| `Login.jsx` | `/login` | All |
| `Signup.jsx` | `/signup` | All |
| `ForgotPassword.jsx` | `/forgot-password` | All |
| `RoleSelect.jsx` | `/role-select` | Authenticated |
| `AdminDashboard.jsx` | `/admin/dashboard` | Admin |
| `ManagerDashboard.jsx` | `/manager/dashboard` | Manager |
| `CashierDashboard.jsx` | `/cashier/dashboard` | Cashier |
| `CashierPanelPage.jsx` | `/cashier/panel` | Cashier |
| `Products.jsx` | `/products` | Admin, Manager |
| `AddProduct.jsx` | `/products/add` | Admin, Manager |
| `Catalog.jsx` | `/catalog` | All |
| `Receipts.jsx` | `/receipts` | Cashier, Admin |
| `ReportsPage.jsx` | `/reports` | Admin, Manager |
| `Employees.jsx` | `/employees` | Admin, Manager |
| `Departments.jsx` | `/departments` | Admin |
| `SalaryManagement.jsx` | `/salary` | Admin, Manager |
| `SalaryHistory.jsx` | `/salary/history` | Admin, Manager |
| `Assets.jsx` | `/assets` | Admin |
| `Expenses.jsx` | `/expenses` | Admin, Manager |
| `Projects.jsx` | `/projects` | Admin, Manager |
| `Alerts.jsx` | `/alerts` | Admin, Manager |
| `AuditLogs.jsx` | `/audit-logs` | Admin |
| `MyProfile.jsx` | `/profile` | All |
| `CustomerChequeExchange.jsx` | `/cheque-exchange` | Admin, Manager |
| `inventory/*` | `/inventory/...` | Admin, Manager |
| `procurement/*` | `/procurement/...` | Admin, Manager |
| `returns/*` | `/returns/...` | Admin, Manager, Cashier |
| `suppliers/*` | `/suppliers/...` | Admin, Manager |
| `products/*` | `/products/...` | Admin, Manager |

---

## 🛠️ Development

### Prerequisites
- Node.js >= 18
- npm >= 9
- Backend server running on `http://localhost:5000`

### Install & run
```bash
cd client
npm install
npm run dev
```

App available at **http://localhost:5173**. API requests are proxied automatically.

### Lint
```bash
npm run lint
```

### Build for production
```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build locally
```

---

## 🌐 Deployment (Vercel)

1. Connect the `client/` directory (or the whole repo with Vercel's root override) to a Vercel project.
2. Set **Build command**: `npm run build`
3. Set **Output directory**: `dist`
4. Add environment variable: `VITE_API_URL=https://your-backend-url.com`
5. The `vercel.json` at the repo root handles SPA client-side routing rewrites automatically.

> **Note**: The `vercel.json` rewrite (`/(.*) → /index.html`) is placed at the **repo root**, not inside `client/`. Vercel should be configured to use `client/` as the root directory.

---

## 🔌 Real-time (Socket.IO)

The frontend connects to the backend Socket.IO server via the Vite proxy. Events such as new alerts, stock changes, and dashboard updates are pushed in real time. The Socket.IO client is initialised in the relevant page/context files and connects to `/socket.io` (proxied to the backend).

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `redux` + `redux-thunk` | Global state management |
| `@tanstack/react-query` | Server-state caching & fetching |
| `axios` | HTTP requests to the API |
| `socket.io-client` | Real-time WebSocket connection |
| `recharts` | Charts and data visualisations |
| `framer-motion` | Page/component animations |
| `lucide-react` | Icon library |
| `@radix-ui/react-slot` | Accessible UI primitives |
| `jspdf` + `html2canvas` | Client-side PDF/screenshot export |
| `react-hot-toast` | Toast notifications |
| `@hookform/resolvers` | Form validation helpers |
