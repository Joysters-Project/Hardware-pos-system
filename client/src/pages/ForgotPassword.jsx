import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ForgotPassword.css";
import logo from "../assets/logo.png";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Password reset request for:", email);
    navigate("/"); 
    
  };

  return (
    <div className="forgot-container">
        <div className="forgot-page">
            <img src={logo} alt="Mathumithan Logo" className="forgot-logo" />
            <h2>Forgot Password</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-box">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        //value={number}
                        //onChange={(e) => setNumber(e.target.value)}
                        //required
                       onChange={(e) => setEmail(e.target.value)}
                       required
                    />
                </div>
            <button type="submit">Reset Password</button>
            </form>

            <p style={{ marginTop: "10px" }}>
                Remembered your password?{" "}
                <span
                style={{ color: "#ff6c3c", cursor: "pointer" }}
                onClick={() => navigate("/")}
                >
                Back to Login
                </span>
            </p>
        </div>
      
    </div>
  );
}

export default ForgotPassword;
