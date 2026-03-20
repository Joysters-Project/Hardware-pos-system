import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import logo from "../assets/logo.png";

function Login() {

  const navigate = useNavigate();
  const { role } = useParams();

  const [userName,setUserName] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) =>{
    e.preventDefault();

    if(userName && password){
      navigate("/dashboard/" + role);
    }else{
      alert("Enter password");
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
              reduired
              />
            </div>

            <button className="login-btn">
              LOGIN
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