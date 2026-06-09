import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { login } = useAuth();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleParam = role || "User";  // fallback if undefined
  /*
    const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); // go back
    } else {
      navigate("/"); // fallback to role selection
    }
    };
    */
  const handleBack = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_name: userName,
          password: password,
          role: role //Role is sending to backend
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(" Login successful!");

        // Use AuthContext instead of direct localStorage
        if (data.token) {
          login(data.user_name || userName, data.token, (role || "").toLowerCase());
        }

        setTimeout(() => navigate("/dashboard/" + role.toLowerCase()), 1500);
      } else {
        toast.error(data.message || data || " Login failed");
      }
    } catch (error) {
      toast.error(" Connection error: " + error.message);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* <div className="login-left">
        <img src={logo} alt="background" />
      </div> */}

      <div className="login-right">
        <div className="login-card">
          <h1 className="title">{roleParam} Login</h1>
          <p className="subtitle">login with username</p>

          <img src={logo} alt="logo" className="logo" />

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-box" style={{position:"relative"}}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <span
                onClick={() => setShowPassword(v => !v)}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",cursor:"pointer",userSelect:"none",fontSize:18}}
              >{showPassword ? "🙈" : "👁️"}</span>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "LOGIN"}
            </button>

            <div className="links">
              <Link to="/forgot-password">Forgot Password?</Link>
              <Link to="/signup">Signup</Link>
            </div>
          </form>
          <button type="button" className="login-btn" onClick={handleBack}> Home</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
