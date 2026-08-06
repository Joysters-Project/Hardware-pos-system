import { useEffect } from "react";
import { LogOut, X } from "lucide-react";
import "./LogoutConfirmModal.css";

export default function LogoutConfirmModal({ isOpen, onCancel, onLogout }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" || e.key === "NumpadEnter") {
        e.preventDefault();
        onLogout();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel, onLogout]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lcm-overlay" onClick={onCancel}>
      <div className="lcm-card" onClick={(e) => e.stopPropagation()}>
        <button className="lcm-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="lcm-icon-wrapper">
          <LogOut size={28} />
        </div>
        <h2 className="lcm-title">Confirm Logout</h2>
        <p className="lcm-message">
          Are you sure you want to log out of the system?
          <br />
          <span style={{ fontSize: "12px", color: "#888", display: "inline-block", marginTop: "6px" }}>
            (Press <strong>Enter</strong> to confirm logout)
          </span>
        </p>
        <div className="lcm-actions">
          <button type="button" className="lcm-btn lcm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="lcm-btn lcm-btn-logout" onClick={onLogout} autoFocus>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
