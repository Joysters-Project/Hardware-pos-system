import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import CashierDashboard from "./pages/CashierDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import Departments from "./pages/Departments";
import Products from "./pages/Products";
import Catalog from "./pages/Catalog";
import BillingSystem from "./components/billingSystem";
import DueCollection from "./components/DueCollection";
import ReturnPage from "./pages/ReturnPage";

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      {!isAuthenticated && (
        <>
          <Route path="/" element={<RoleSelect />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </>
      )}

      <Route path="/login/:role" element={<Login />} />
      
      {/* Protected routes for Admin */}
      <Route 
        path="/dashboard/admin" 
        element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} 
      />

      {/* Protected routes for Cashier */}
      <Route 
        path="/dashboard/cashier" 
        element={<ProtectedRoute requiredRole="cashier"><CashierDashboard /></ProtectedRoute>} 
      />

      {/* Protected routes for Manager */}
      <Route 
        path="/dashboard/manager" 
        element={<ProtectedRoute requiredRole="manager"><ManagerDashboard /></ProtectedRoute>} 
      />

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
      <Route 
        path="/returns" 
        element={<ProtectedRoute><ReturnPage userRole={role} /></ProtectedRoute>} 
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
        path="/manager/catalog" 
        element={<ProtectedRoute requiredRole="manager"><Catalog /></ProtectedRoute>} 
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? (role ? `/dashboard/${role.toLowerCase()}` : "/dashboard/admin") : "/"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
