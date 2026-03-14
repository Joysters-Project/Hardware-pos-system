import { useNavigate } from "react-router-dom";
import "../styles/RoleSelect.css";
import logo from "../assets/logo.png";

function RoleSelect() {
  const navigate = useNavigate();

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
