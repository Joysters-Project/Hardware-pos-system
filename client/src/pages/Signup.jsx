import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/Signup.css";
import logo from "../assets/logo.png";

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: "",
    employee_id: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account created successfully!");
        setFormData({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: "",
          role: "",
          employee_id: ""
        });
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast.error(data.message || "Failed to create account");
      }
    } catch (error) {
      toast.error("Connection error: " + error.message);
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-page">
        <img src={logo} alt="Mathumithan Logo" className="signup-logo" />
        <h2>Create Account</h2>
        {/* <p>Step {step} of 2</p> */}

        <form onSubmit={handleSubmit}>
          {step ===1&& (
            <div className="input-box">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
                <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <button type="button" onClick={() => setStep(2)} disabled={loading}>
                  Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="input-box">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
              
              <select name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="" disabled hidden>Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
              </select>
              <input
                type="number"
                name="employee_id"
                placeholder="Employee ID"
                value={formData.employee_id}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <button type="button" onClick={() => setStep(1)} disabled={loading}>
                  Back
              </button>
            <button type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            </div>
          )}
        </form>

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          Already have an account? <Link to="/">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
