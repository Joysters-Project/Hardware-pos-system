import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/ForgotPassword.css";
import logo from "../assets/logo.png";

const API = "/api/auth";

// ─── Step indicators ────────────────────────────────────────────────────────
const steps = ["Enter Email", "Verify OTP", "New Password"];

function StepBar({ current }) {
  return (
    <div className="fp-steps">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`fp-step ${i < current ? "done" : i === current ? "active" : ""}`}>
            <div className="fp-step-circle">
              {i < current ? "✓" : i + 1}
            </div>
            <span className="fp-step-label">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`fp-step-line ${i < current ? "done" : ""}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OTP digit input boxes ───────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputsRef = useRef([]);
  const digits = value.split("");

  const handleKey = (e, idx) => {
    if (e.key === "Backspace") {
      const next = [...digits];
      if (next[idx]) {
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        inputsRef.current[idx - 1].focus();
      }
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = [...digits];
    next[idx] = e.key;
    onChange(next.join("").slice(0, 6));
    if (idx < 5) inputsRef.current[idx + 1].focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    const focusIdx = Math.min(text.length, 5);
    inputsRef.current[focusIdx]?.focus();
    e.preventDefault();
  };

  return (
    <div className="fp-otp-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="fp-otp-box"
          value={digits[i] || ""}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          onChange={() => {}} // controlled via onKeyDown
          readOnly
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0
  const [email, setEmail] = useState("");
  // Step 1
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  // Step 2
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // ── Step 0: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || data.error); return; }
      toast.success("OTP sent! Check your email.");
      setStep(1);
      startResendTimer();
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const id = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || data.error); return; }
      toast.success("New OTP sent!");
      setOtp("");
      startResendTimer();
    } catch {
      toast.error("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error("Please enter the full 6-digit OTP."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || data.error); return; }
      toast.success("OTP verified!");
      setResetToken(data.resetToken);
      setStep(2);
    } catch {
      toast.error("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Reset Password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || data.error); return; }
      toast.success("Password reset successfully! Redirecting to login…");
      setTimeout(() => navigate("/"), 2000);
    } catch {
      toast.error("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="forgot-container">
      <div className="forgot-page">
        <img src={logo} alt="Mathumithan Logo" className="forgot-logo" />
        <h2>Forgot Password</h2>

        <StepBar current={step} />

        {/* ── Step 0: Email ── */}
        {step === 0 && (
          <form onSubmit={handleSendOtp} className="fp-form">
            <p className="fp-hint">Enter your registered email address and we'll send you a one-time password.</p>
            <div className="input-box">
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Step 1: OTP ── */}
        {step === 1 && (
          <form onSubmit={handleVerifyOtp} className="fp-form">
            <p className="fp-hint">
              A 6-digit OTP was sent to <strong>{email}</strong>.<br />
              It expires in 10 minutes.
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            <button type="submit" disabled={loading || otp.length < 6}>
              {loading ? "Verifying…" : "Verify OTP"}
            </button>
            <div className="fp-resend">
              {resendTimer > 0
                ? <span>Resend OTP in {resendTimer}s</span>
                : <span className="fp-resend-link" onClick={handleResend}>Resend OTP</span>
              }
            </div>
            <span className="fp-back" onClick={() => { setStep(0); setOtp(""); }}>← Change email</span>
          </form>
        )}

        {/* ── Step 2: New Password ── */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="fp-form">
            <p className="fp-hint">Choose a strong new password (min. 6 characters).</p>
            <div className="input-box">
              <div className="fp-pw-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
                <span className="fp-pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? "🙈" : "👁️"}
                </span>
              </div>
            </div>
            <div className="input-box">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {/* Password strength bar */}
            {newPassword && (
              <div className="fp-strength">
                <div className={`fp-strength-bar ${
                  newPassword.length < 6 ? "weak"
                  : newPassword.length < 10 ? "medium"
                  : "strong"
                }`} />
                <span>{newPassword.length < 6 ? "Weak" : newPassword.length < 10 ? "Medium" : "Strong"}</span>
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )}

        <p className="fp-footer">
          Remembered your password?{" "}
          <span className="fp-link" onClick={() => navigate("/")}>
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
