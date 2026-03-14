import React, { useState } from "react";
import "../styles/Signup.css";
import logo from "../assets/logo.png";

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sign up data:", formData);
  };

  return (
    <div className="signup-container">
      <div className="signup-page">
        <img src={logo} alt="Mathumithan Logo" className="singup-logo" />
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-box">
            <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
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
          <button type="submit">Sign Up</button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
