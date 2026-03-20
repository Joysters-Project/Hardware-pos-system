import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import logo from "../assets/logo.png";
import api from "../api";

function Login() {

  const navigate = useNavigate();
  const { role } = useParams();

  const [userName,setUserName] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) =>{
    e.preventDefault();
    setError("");

    if(!userName || !password){
      setError("Enter username and password");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        user_name: userName,
        password: password
      });
      
      if(response.status === 200) {
        alert("✅ Login successful!");
        navigate("/dashboard/" + role);
      }
    } catch (err) {
      setError("❌ " + (err.response?.data || "Login failed. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return (

    <div className="login-page">
      <div className="login-left">
        <img src={logo} alt="background"/>
      </div>

      <div className="login-right">
        <div className="login-card">

          <h1 className="title">{role} Login</h1>
          <p className="subtitle">login with username</p>

          <img src={logo} alt="logo" className="logo"/>

          <form onSubmit={handleSubmit}>

            {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

            <div className="input-box">
              <input
              type="text"
              placeholder="Username"
              value={userName}
              onChange={(e)=>setUserName(e.target.value)}
              required
              />
            </div>

            <div className="input-box">
              <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              />
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "LOGGING IN..." : "LOGIN"}
            </button>

            <div className="links">
              <Link to="/forgot-password">Forgot Password?</Link>
              <Link to="/signup">Signup</Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;