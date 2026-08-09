import React, { useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { login, isAuthenticated, role: userRole } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    const normRole = (userRole || "admin").toLowerCase();
    const dashPath = normRole === "manager" ? "/dashboard/manager" : normRole === "cashier" ? "/dashboard/cashier" : "/dashboard/admin";
    return <Navigate to={dashPath} replace />;
  }

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleParam = role || "User";  // fallback if undefined

 const handleBack = () => {
  navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_name: userName,
          password: password,
          role: roleParam
        })
      });

      const rawBody = await response.text();
      let data = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseError) {
        data = { message: rawBody || 'Unexpected server response' };
      }

      if (response.ok) {
        toast.success("Login successful!");

        if (data.token && data.user) {
          const userRoleName = (data.user.role || roleParam).toLowerCase();
          // Store all user information in sessionStorage & localStorage
          sessionStorage.setItem('userId', data.user.user_id);
          sessionStorage.setItem('userName', data.user.user_name);
          sessionStorage.setItem('userFirstName', data.user.first_name);
          sessionStorage.setItem('userLastName', data.user.last_name);
          sessionStorage.setItem('userFullName', `${data.user.first_name} ${data.user.last_name}`);
          
          localStorage.setItem('userId', data.user.user_id);
          localStorage.setItem('userName', data.user.user_name);
          localStorage.setItem('userFirstName', data.user.first_name);
          localStorage.setItem('userLastName', data.user.last_name);
          localStorage.setItem('userFullName', `${data.user.first_name} ${data.user.last_name}`);

          login(data.user.user_name, data.token, userRoleName);
          navigate("/dashboard/" + userRoleName, { replace: true });
        } else {
          navigate("/dashboard/" + roleParam.toLowerCase(), { replace: true });
        }
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      toast.error("Connection error: " + error.message);
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
              <input id="userName" name="userName"
                type="text"
                placeholder="Username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-box" style={{position:"relative"}}>
              <input id="password" name="password"
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
