import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/Signup.css";
import logo from "../assets/logo.png";

function Signup() {
  const navigate = useNavigate();
  const formRef = useRef(null);
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
  const [errors, setErrors] = useState({});

  // Validation rules for all fields
  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
        if (!value.trim()) return "First Name required";
        if (value.trim().length < 2) return "Min 2 characters";
        return "";
      case "lastName":
        if (!value.trim()) return "Last Name required";
        if (value.trim().length < 2) return "Min 2 characters";
        return "";
      case "email":
        if (!value.trim()) return "Email required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Invalid email";
        return "";
      case "password":
        if (!value) return "Password required";
        if (value.length < 6) return "Min 6 characters";
        return "";
      case "username":
        if (!value.trim()) return "Username required";
        if (value.trim().length < 3) return "Min 3 characters";
        return "";
      case "role":
        if (!value) return "Role required";
        return "";
      case "employee_id":
        if (!value) return "Employee ID required";
        if (value < 1) return "Must be positive";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    // Validate all fields on blur
    const validFields = ["firstName", "lastName", "email", "password", "username", "role", "employee_id"];
    if (validFields.includes(name)) {
      const error = validateField(name, value);
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const step2Fields = ["username", "role", "employee_id"];
    const newErrors = {};

    // Validate all Step 2 fields
    step2Fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    // Only submit if no errors
    if (Object.keys(newErrors).length > 0) {
      return;
    }

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

  const handleNextStep = () => {
    const step1Fields = ["firstName", "lastName", "email", "password"];
    const newErrors = {};

    // Validate all Step 1 fields
    step1Fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    // Only proceed if no errors
    if (Object.keys(newErrors).length === 0) {
      setStep(2);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-page">
        <img src={logo} alt="Mathumithan Logo" className="signup-logo" />
        <h2>Create Account</h2>
        {/* <p>Step {step} of 2</p> */}

        <form onSubmit={handleSubmit} ref={formRef}>
          {step ===1&& (
            <div className="input-box">
              <div className="form-group">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.firstName ? "input-error" : ""}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.lastName ? "input-error" : ""}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.email ? "input-error" : ""}
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.password ? "input-error" : ""}
                />
                {errors.password && (
                  <span className="error-message">{errors.password}</span>
                )}
              </div>

              <button type="button" onClick={handleNextStep} disabled={loading}>
                  Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="input-box">
              <div className="form-group">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.username ? "input-error" : ""}
                />
                {errors.username && (
                  <span className="error-message">{errors.username}</span>
                )}
              </div>
              
              <div className="form-group">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.role ? "input-error" : ""}
                >
                  <option value="" disabled hidden>Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                </select>
                {errors.role && (
                  <span className="error-message">{errors.role}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="number"
                  name="employee_id"
                  placeholder="Employee ID"
                  value={formData.employee_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={errors.employee_id ? "input-error" : ""}
                  min="1"
                />
                {errors.employee_id && (
                  <span className="error-message">{errors.employee_id}</span>
                )}
              </div>

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
          Already have an account? <Link to="/" style={{ color: "#dc3545",textDecoration: "none",fontWeight: "bold",marginLeft: "5px"}}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
