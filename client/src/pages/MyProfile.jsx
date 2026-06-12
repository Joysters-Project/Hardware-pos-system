import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Edit3, Lock, Save, X, LogOut,
  Mail, Phone, ShieldCheck, Trash2, User,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import "../styles/MyProfile.css";

const BASE_URL = "http://localhost:5000";
const SL_PHONE  = /^(?:\+94|0)?7(?:0|1|2|4|5|6|7|8)\d{7}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getInitials = (v) =>
  v ? v.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "US";

export default function MyProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileRef = useRef();

  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activePanel,  setActivePanel]  = useState("none"); // 'none'|'edit'|'password'
  const [saving,       setSaving]       = useState(false);
  const [pwdLoading,   setPwdLoading]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone_no: "", address: "", profile_photo: null,
  });

  const [pwd, setPwd] = useState({
    current_password: "", new_password: "", confirm_password: "",
  });

  /* ── load ───────────────────────────────────────── */
  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
      syncForm(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  const syncForm = (p) => {
    setForm({
      first_name: p.first_name || "", last_name: p.last_name || "",
      email: p.email || "", phone_no: p.phone_no || "",
      address: p.address || "", profile_photo: null,
    });
    setPhotoPreview(p.profile_photo ? `${BASE_URL}/${p.profile_photo}` : null);
  };

  useEffect(() => { loadProfile(); }, []);

  /* ── photo actions ──────────────────────────────── */
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, profile_photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    try {
      await api.delete("/profile/photo");
      setPhotoPreview(null);
      setForm((f) => ({ ...f, profile_photo: null }));
      setProfile((p) => ({ ...p, profile_photo: null }));
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  /* ── panel toggles ──────────────────────────────── */
  const openEdit = () => {
    syncForm(profile);
    setActivePanel((p) => (p === "edit" ? "none" : "edit"));
  };

  const openPwd = () => {
    setPwd({ current_password: "", new_password: "", confirm_password: "" });
    setActivePanel((p) => (p === "password" ? "none" : "password"));
  };

  const closePanel = () => {
    if (profile) syncForm(profile);
    setActivePanel("none");
  };

  /* ── save profile ───────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim())
      return toast.error("First and last name are required");
    if (!EMAIL_RE.test(form.email))
      return toast.error("Enter a valid email address");
    if (form.phone_no && !SL_PHONE.test(form.phone_no.trim()))
      return toast.error("Enter a valid Sri Lankan phone number");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("first_name",    form.first_name);
      fd.append("last_name",     form.last_name);
      fd.append("email",         form.email);
      fd.append("phone_no",      form.phone_no);
      fd.append("address",       form.address);
      if (form.profile_photo) fd.append("profile_photo", form.profile_photo);

      const res = await api.put("/profile", fd);
      setProfile(res.data);
      syncForm(res.data);
      setActivePanel("none");
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  /* ── change password ────────────────────────────── */
  const handlePwd = async (e) => {
    e.preventDefault();
    if (!pwd.current_password || !pwd.new_password || !pwd.confirm_password)
      return toast.error("All password fields are required");
    if (pwd.new_password !== pwd.confirm_password)
      return toast.error("New passwords must match");
    if (pwd.new_password.length < 6)
      return toast.error("New password must be at least 6 characters");

    setPwdLoading(true);
    try {
      await api.post("/profile/change-password", pwd);
      setPwd({ current_password: "", new_password: "", confirm_password: "" });
      setActivePanel("none");
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to change password");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  /* ── loading skeleton ───────────────────────────── */
  if (loading) {
    return (
      <DashboardLayout active="profile">
        <div className="pf-loading">Loading profile…</div>
      </DashboardLayout>
    );
  }

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.username;

  return (
    <DashboardLayout active="profile">
      <div className="pf-page">

        {/* ── Top header ── */}
        <div className="pf-header">
          <h1>Account Overview</h1>
          <p>Manage your profile, contact details and password.</p>
        </div>

        {/* ── Main overview card (hidden when a panel is open) ── */}
        {activePanel === "none" && <div className="pf-overview-card">

          {/* Photo block */}
          <div className="pf-photo-block">
            <div className="pf-photo-ring">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="pf-photo-img" />
                : <div className="pf-photo-initials">{getInitials(fullName)}</div>
              }
              {/* camera overlay — click triggers file input */}
              {/* <button
                type="button"
                className="pf-photo-overlay"
                onClick={() => fileRef.current?.click()}
                title="Change photo"
              > */}
                {/* <Camera size={18} /> */}
                {/* <span>Change</span> */}
              {/* </button> */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>
            {/* delete photo button — only when photo exists */}
            {photoPreview && (
              <button
                type="button"
                className="pf-photo-delete"
                onClick={handleDeletePhoto}
                title="Remove photo"
              >
                <Trash2 size={13} /> Remove photo
              </button>
            )}
          </div>

          {/* Name + role */}
          <div className="pf-identity">
            <h2>{fullName}</h2>
            <span className="pf-role-pill">{profile?.role}</span>
          </div>

          {/* Info grid */}
          <div className="pf-info-grid">
            {[
              { label: "Username",       val: profile?.username },
              { label: "Employee ID",    val: profile?.employee_id ? `EMP-${String(profile.employee_id).padStart(4,"0")}` : "—" },
              { label: "Department",     val: profile?.department  || "—" },
              { label: "Position",       val: profile?.position    || "—" },
              { label: "Email",          val: profile?.email       || "—" },
              { label: "Phone",          val: profile?.phone_no    || "—" },
              { label: "Address",        val: profile?.address     || "—" },
              { label: "Join Date",      val: profile?.join_date   || "—" },
              { label: "Status",         val: profile?.status },
            ].map(({ label, val }) => (
              <div className="pf-info-row" key={label}>
                <span className="pf-info-label">{label}</span>
                <span className="pf-info-val">{val}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="pf-action-row">
            <button
              type="button"
              className={`pf-btn pf-btn--primary ${activePanel === "edit" ? "active" : ""}`}
              onClick={openEdit}
            >
              <Edit3 size={15} /> Edit Profile
            </button>
            <button
              type="button"
              className={`pf-btn pf-btn--outline ${activePanel === "password" ? "active" : ""}`}
              onClick={openPwd}
            >
              <Lock size={15} /> Change Password
            </button>
            <button type="button" className="pf-btn pf-btn--ghost" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>}

        {/* ── Edit Profile panel (shown only when activePanel === 'edit') ── */}
        {activePanel === "edit" && (
          <div className="pf-panel">
            <div className="pf-panel__head">
              <div>
                <h3>Edit Profile</h3>
                <p>Update your name, contact information and profile photo.</p>
              </div>
              <button type="button" className="pf-panel__close" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="pf-form">
              <div className="pf-form-grid">
                <div className="pf-field">
                  <label>First Name</label>
                  <input name="first_name" value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div className="pf-field">
                  <label>Last Name</label>
                  <input name="last_name" value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--icon">
                  <label>Email Address</label>
                  <Mail size={15} className="pf-field-icon" />
                  <input type="email" name="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--icon">
                  <label>Phone Number</label>
                  <Phone size={15} className="pf-field-icon" />
                  <input type="tel" name="phone_no" value={form.phone_no}
                    placeholder="07XXXXXXXX"
                    onChange={(e) => setForm((f) => ({ ...f, phone_no: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--full">
                  <label>Address</label>
                  <textarea name="address" rows={3} value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--full">
                  <label>Profile Photo</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} />
                  <span className="pf-hint">JPEG / PNG / WEBP · max 5 MB</span>
                </div>
              </div>

              <div className="pf-form-footer">
                <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>
                  <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
                </button>
                <button type="button" className="pf-btn pf-btn--ghost" onClick={closePanel}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Change Password panel (shown only when activePanel === 'password') ── */}
        {activePanel === "password" && (
          <div className="pf-panel">
            <div className="pf-panel__head">
              <div>
                <h3>Change Password</h3>
                <p>Keep your account secure by updating your password regularly.</p>
              </div>
              <button type="button" className="pf-panel__close" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePwd} className="pf-form">
              <div className="pf-form-grid">
                <div className="pf-field pf-field--full pf-field--icon">
                  <label>Current Password</label>
                  <Lock size={15} className="pf-field-icon" />
                  <input type="password" value={pwd.current_password}
                    onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--icon">
                  <label>New Password</label>
                  <Lock size={15} className="pf-field-icon" />
                  <input type="password" value={pwd.new_password}
                    onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
                </div>
                <div className="pf-field pf-field--icon">
                  <label>Confirm New Password</label>
                  <Lock size={15} className="pf-field-icon" />
                  <input type="password" value={pwd.confirm_password}
                    onChange={(e) => setPwd((p) => ({ ...p, confirm_password: e.target.value }))} />
                </div>
              </div>

              <div className="pf-form-footer">
                <button type="submit" className="pf-btn pf-btn--primary" disabled={pwdLoading}>
                  <ShieldCheck size={15} /> {pwdLoading ? "Updating…" : "Update Password"}
                </button>
                <button type="button" className="pf-btn pf-btn--ghost" onClick={closePanel}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
