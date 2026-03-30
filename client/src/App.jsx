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
import Employees from "./pages/Employees";

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontSize: '18px',
      color: '#333'
    }}>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes - always available */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard/admin" replace /> : <RoleSelect />} />
      <Route path="/login/:role" element={isAuthenticated ? <Navigate to="/dashboard/admin" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard/admin" replace /> : <Signup />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard/admin" replace /> : <ForgotPassword />} />

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
        path="/employees" 
        element={<ProtectedRoute><Employees /></ProtectedRoute>} 
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
        path="/manager/employees" 
        element={<ProtectedRoute requiredRole="manager"><Employees /></ProtectedRoute>} 
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard/admin" : "/"} replace />} />
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
