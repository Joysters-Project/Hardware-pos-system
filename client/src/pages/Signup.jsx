import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";
import logo from "../assets/logo.png";
import api from "../api";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_name: "",
    first_name: "",
    last_name: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if(!formData.user_name || !formData.first_name || !formData.last_name || !formData.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        user_name: formData.user_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        role: 'User',
        employee_id: null
      });

      if(response.status === 201) {
        alert("✅ Account created successfully!");
        navigate("/login/user");
      }
    } catch (err) {
      setError("❌ " + (err.response?.data?.error || "Signup failed. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-page">
        <img src={logo} alt="Mathumithan Logo" className="singup-logo" />
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
          
          <div className="input-box">
            <input
            type="text"
            name="user_name"
            placeholder="Username"
            value={formData.user_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          </div>
          <button type="submit" disabled={loading}>{loading ? "SIGNING UP..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
