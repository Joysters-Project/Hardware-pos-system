import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/RoleSelect.css";
import logo from "../assets/logo.png";

function RoleSelect() {
  const navigate = useNavigate();
  const { isAuthenticated, role: userRole } = useAuth();

  if (isAuthenticated) {
    const normRole = (userRole || "admin").toLowerCase();
    const dashPath = normRole === "manager" ? "/dashboard/manager" : normRole === "cashier" ? "/dashboard/cashier" : "/dashboard/admin";
    return <Navigate to={dashPath} replace />;
  }

  const goToLogin = (role) => {
    navigate("/login/" + role.toLowerCase());
  };

  return (
    <div className="role-container">
      <div className="role-card">
        <img src={logo} alt="Mathumithan Logo" className="role-logo" />
        <h1 className="role-title">Select Your Role</h1>
        <div className="role-buttons">
          <button onClick={() => goToLogin("Admin")}>Admin</button>
          <button onClick={() => goToLogin("Cashier")}>Cashier</button>
          <button onClick={() => goToLogin("Manager")}>Manager</button>
        </div>
      </div>
    </div>
  );
}

export default RoleSelect;
