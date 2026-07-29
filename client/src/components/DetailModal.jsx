import { useEffect } from "react";
import "./DetailModal.css";

/**
 * Generic read-only detail modal.
 * Props:
 *   title    – string shown in the header
 *   onClose  – called when the user closes the modal
 *   children – the detail content to render inside
 */
export default function DetailModal({ title, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-box" onClick={(e) => e.stopPropagation()}>
        <div className="dm-header">
          <h2 className="dm-title">{title}</h2>
          <button className="dm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dm-body">{children}</div>
        <div className="dm-footer">
          <button className="dm-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
