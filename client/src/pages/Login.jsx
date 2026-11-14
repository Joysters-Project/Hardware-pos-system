import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, House } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { login, isAuthenticated, role: userRole } = useAuth();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    const normRole = (userRole || "admin").toLowerCase();
    const dashPath = normRole === "manager" ? "/dashboard/manager" : normRole === "cashier" ? "/dashboard/cashier" : "/dashboard/admin";
    return <Navigate to={dashPath} replace />;
  }

  const roleParam = role || "User";
  const isAdmin = roleParam.toLowerCase() === "admin";

  const canvasRef = useRef(null);
  useEffect(() => {
    if (!isAdmin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,160,160,${p.o})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(180,80,80,${0.12 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [isAdmin]);

  const handleBack = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
          user_name: userName,
          password: password,
          role: roleParam
      });

      toast.success("Login successful!");

      if (data.token && data.user) {
        const userRoleName = (data.user.role || roleParam).toLowerCase();
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
    } catch (error) {
      toast.error(error.response?.data?.message || "Connection error: " + error.message);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page${isAdmin ? " login-page--admin" : ""}`}>
      {isAdmin && (
        <>
          <canvas ref={canvasRef} className="admin-canvas" />
          <div className="admin-grid-overlay" />
          <div className="admin-orb admin-orb--1" />
          <div className="admin-orb admin-orb--2" />
          <div className="admin-orb admin-orb--3" />
        </>
      )}

      <div className="login-right">
        <div className="login-card">
          <h1 className="title">{roleParam} Login</h1>
          

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

            <div className="input-box password-input-box">
              <input id="password" name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "LOGIN"}
            </button>

            <div className="links">
              <Link to="/forgot-password">Forgot Password?</Link>
              {roleParam.toLowerCase() !== "admin" && <Link to="/signup">Signup</Link>}
            </div>
          </form>
          <button type="button" className="login-home-btn" onClick={handleBack}>
            <House size={16} aria-hidden="true" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
