import { useState } from "react";
import "./Login.css";

function Login() {
  return (
    <div className="container">

      <div className="login-box">

        <div className="avatar">
          <img src="https://as2.ftcdn.net/jpg/01/43/35/17/1000_F_143351711_VWYefgK2ZXVpWtTDpFKIiShRc88vcTiy.jpg" />
        </div>

        <h2>Admin</h2>
        <h1>Welcome</h1>
        <p>Login with Username</p>

        <form>

          <label>Username</label>
          <input type="text" placeholder="Enter your username"/>

          <label>Password</label>
          <div className="password-row">
            <input type="password" placeholder="Enter your password"/>
            <span>Forgot password?</span>
          </div>

          <button type="submit">Login</button>

          <p className="signup">
            Don't have an account? <a href="#">Sign up</a>
          </p>

        </form>

      </div>

    </div>
  )
}

export default Login