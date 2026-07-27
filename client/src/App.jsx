import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import Signup from "./pages/Signup";
import ReturnsLayout from "./pages/returns/ReturnsLayout";
import ProcessReturn from "./pages/returns/ProcessReturn";
import ReturnInventory from "./pages/returns/ReturnInventory";

import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import CashierDashboard from "./pages/CashierDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import Departments from "./pages/Departments";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import ProductForm from "./pages/products/ProductForm";
import Alerts from "./pages/Alerts";
import Employees from "./pages/Employees";
import Catalog from "./pages/Catalog";
import Assets from "./pages/Assets";
import Expenses from "./pages/Expenses";
import SalaryManagement from "./pages/SalaryManagement";
import AuditLogs from "./pages/AuditLogs";
import SalaryHistory from "./pages/SalaryHistory";
import Projects from "./pages/Projects";
import MyProfile from "./pages/MyProfile";
import BillingSystem from "./components/billingSystem";
import DueCollection from "./components/DueCollection";
import ReturnSystem from "./components/ReturnSystem";
import Receipts from "./pages/Receipts";
import ReportsPage from "./pages/ReportsPage";
import CashierPanelPage from "./pages/CashierPanelPage";

import ProcurementWorkspace from "./components/procurement/ProcurementWorkspace";
import SupplierList from "./pages/suppliers/SupplierList";
import SupplierForm from "./pages/suppliers/SupplierForm";
import SupplierDetail from "./pages/suppliers/SupplierDetail";
import PurchaseOrderList from "./pages/procurement/PurchaseOrderList";
import CreatePurchaseOrder from "./pages/procurement/CreatePurchaseOrder";
import PurchaseOrderDetail from "./pages/procurement/PurchaseOrderDetail";
import ProcurementDashboard from "./pages/procurement/ProcurementDashboard";
import PaymentDashboard from "./pages/procurement/PaymentDashboard";
import AnalyticsDashboard from "./pages/procurement/AnalyticsDashboard";
import ForecastDashboard from "./pages/procurement/ForecastDashboard";
import NotificationCenter from "./pages/procurement/NotificationCenter";
import ProcurementReports from "./pages/procurement/ProcurementReports";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

function ProcPage({ active, children }) {
  return <DashboardLayout active={active}>{children}</DashboardLayout>;
}

function AppRoutes() {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", backgroundColor: "#f5f5f5", fontSize: "18px", color: "#333",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RoleSelect />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Dashboards */}
      <Route path="/dashboard/admin"   element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/cashier" element={<ProtectedRoute requiredRole="cashier"><CashierDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/manager" element={<ProtectedRoute requiredRole="manager"><ManagerDashboard /></ProtectedRoute>} />

      {/* Shared */}
      <Route path="/departments"    element={<ProtectedRoute><Departments /></ProtectedRoute>} />
      <Route path="/products"       element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/products/add"   element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
      <Route path="/products/edit/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
      <Route path="/employees"      element={<ProtectedRoute><Employees /></ProtectedRoute>} />
      <Route path="/catalog"        element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
      <Route path="/billing"        element={<ProtectedRoute><BillingSystem /></ProtectedRoute>} />
      <Route path="/due-collection" element={<ProtectedRoute><DueCollection /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute><ReturnsLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="process" replace />} />
        <Route path="process" element={<ProcessReturn />} />
        <Route path="inventory" element={<ReturnInventory />} />
      </Route>
      {/* <Route path="/return-logs"    element={<ProtectedRoute><ReturnLogsPage /></ProtectedRoute>} /> */}
      <Route path="/reports"        element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/receipts"       element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
      <Route path="/cashier-panel"  element={<ProtectedRoute><CashierPanelPage /></ProtectedRoute>} />
      <Route path="/assets"         element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/expenses"       element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/salary"         element={<ProtectedRoute><SalaryManagement /></ProtectedRoute>} />
      <Route path="/salary/history" element={<ProtectedRoute><SalaryHistory /></ProtectedRoute>} />
      <Route path="/projects"         element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/manager/projects" element={<ProtectedRoute requiredRole="manager"><Projects /></ProtectedRoute>} />

      {/* Manager-prefixed */}
      <Route path="/manager/departments"    element={<ProtectedRoute requiredRole="manager"><Departments /></ProtectedRoute>} />
      <Route path="/manager/products"       element={<ProtectedRoute requiredRole="manager"><Products /></ProtectedRoute>} />
      <Route path="/manager/products/add"   element={<ProtectedRoute requiredRole="manager"><AddProduct /></ProtectedRoute>} />
      <Route path="/manager/products/edit/:id" element={<ProtectedRoute requiredRole="manager"><ProductForm /></ProtectedRoute>} />
      <Route path="/manager/employees"      element={<ProtectedRoute requiredRole="manager"><Employees /></ProtectedRoute>} />
      <Route path="/manager/assets"         element={<ProtectedRoute requiredRole="manager"><Assets /></ProtectedRoute>} />
      <Route path="/manager/expenses"       element={<ProtectedRoute requiredRole="manager"><Expenses /></ProtectedRoute>} />
      <Route path="/manager/salary"         element={<ProtectedRoute requiredRole="manager"><SalaryManagement /></ProtectedRoute>} />
      <Route path="/manager/salary/history" element={<ProtectedRoute requiredRole="manager"><SalaryHistory /></ProtectedRoute>} />

      {/* Admin-only */}
      <Route path="/audit-logs" element={<ProtectedRoute requiredRole="admin"><AuditLogs /></ProtectedRoute>} />
      {/* Shared protected routes */}
      <Route 
        path="/departments" 
        element={<ProtectedRoute><Departments /></ProtectedRoute>} 
      />
      <Route 
        path="/products" 
        element={<ProtectedRoute><Products /></ProtectedRoute>} 
      />
      <Route 
        path="/products/add" 
        element={<ProtectedRoute><AddProduct /></ProtectedRoute>} 
      />
      <Route 
        path="/alerts" 
        element={<ProtectedRoute><Alerts /></ProtectedRoute>} 
      />
      <Route 
        path="/employees" 
        element={<ProtectedRoute><Employees /></ProtectedRoute>} 
      />
      <Route 
        path="/catalog" 
        element={<ProtectedRoute><Catalog /></ProtectedRoute>} 
      />
      <Route 
        path="/billing" 
        element={<ProtectedRoute><BillingSystem /></ProtectedRoute>} 
      />
      <Route 
        path="/due-collection" 
        element={<ProtectedRoute><DueCollection /></ProtectedRoute>} 
      />
      <Route path="/returns" element={<ProtectedRoute><ReturnsLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="process" replace />} />
        <Route path="process" element={<ProcessReturn />} />
        <Route path="inventory" element={<ReturnInventory />} />
      </Route>
      <Route 
        path="/reports" 
        element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/receipts" 
        element={<ProtectedRoute><Receipts /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/departments" 
        element={<ProtectedRoute requiredRole="manager"><Departments /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/products" 
        element={<ProtectedRoute requiredRole="manager"><Products /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/products/add" 
        element={<ProtectedRoute requiredRole="manager"><AddProduct /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/employees" 
        element={<ProtectedRoute requiredRole="manager"><Employees /></ProtectedRoute>} 
      />
      <Route 
        path="/assets" 
        element={<ProtectedRoute><Assets /></ProtectedRoute>} 
      />
      <Route 
        path="/expenses" 
        element={<ProtectedRoute><Expenses /></ProtectedRoute>} 
      />
      <Route 
        path="/salary" 
        element={<ProtectedRoute><SalaryManagement /></ProtectedRoute>} 
      />
      <Route 
        path="/salary/history" 
        element={<ProtectedRoute><SalaryHistory /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/salary" 
        element={<ProtectedRoute requiredRole="manager"><SalaryManagement /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/salary/history" 
        element={<ProtectedRoute requiredRole="manager"><SalaryHistory /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/assets" 
        element={<ProtectedRoute requiredRole="manager"><Assets /></ProtectedRoute>} 
      />
      <Route 
        path="/manager/expenses" 
        element={<ProtectedRoute requiredRole="manager"><Expenses /></ProtectedRoute>} 
      />
      <Route
        path="/manager/alerts"
        element={<ProtectedRoute requiredRole="manager"><Alerts /></ProtectedRoute>}
      />

      {/* Profile — all authenticated roles */}
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

      <Route
        path="/procurement"
        element={
          <ProtectedRoute>
            <ProcPage active="procurement">
              <ProcurementWorkspace />
            </ProcPage>
          </ProtectedRoute>
        }
      >
        <Route index                      element={<ProcurementDashboard />} />
        <Route path="suppliers"           element={<SupplierList />} />
        <Route path="suppliers/add"       element={<SupplierForm />} />
        <Route path="suppliers/edit/:id"  element={<SupplierForm />} />
        <Route path="suppliers/:id"       element={<SupplierDetail />} />
        <Route path="orders"              element={<PurchaseOrderList />} />
        <Route path="orders/create"       element={<CreatePurchaseOrder />} />
        <Route path="orders/:id"          element={<PurchaseOrderDetail />} />
        <Route path="payments"            element={<PaymentDashboard />} />
        <Route path="analytics"           element={<AnalyticsDashboard />} />
        <Route path="forecast"            element={<ForecastDashboard />} />
        <Route path="reports"             element={<ProcurementReports />} />
        <Route path="notifications"       element={<NotificationCenter />} />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? `/dashboard/${role || "admin"}` : "/"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" reverseOrder={false} />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
