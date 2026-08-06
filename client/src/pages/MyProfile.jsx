import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Edit3, Lock, Save, X, LogOut,
  Mail, Phone, ShieldCheck, Trash2, Crop,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/axios";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import "../styles/MyProfile.css";

const BASE_URL = "http://localhost:5000";
const SL_PHONE  = /^(?:\+94|0)?7(?:0|1|2|4|5|6|7|8)\d{7}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getInitials = (v) =>
  v ? v.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "US";

export default function MyProfile() {
  const navigate = useNavigate();
  const { logout, updateProfilePhoto } = useAuth();
  const fileRef         = useRef(); // used in edit form
  const overviewFileRef = useRef(); // used in overview circle

  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activePanel,  setActivePanel]  = useState("none"); // 'none'|'edit'|'password'
  const [saving,       setSaving]       = useState(false);
  const [pwdLoading,   setPwdLoading]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Crop state — fixed circle, user pans/zooms the image
  const [cropSrc, setCropSrc]       = useState(null);
  const [cropFile, setCropFile]     = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [imgOffset, setImgOffset]   = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale]     = useState(1);
  const [minZoom, setMinZoom]       = useState(1);
  const [dragging, setDragging]     = useState(false);
  const [dragStart, setDragStart]   = useState({ mx: 0, my: 0, ox: 0, oy: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const stageRef      = useRef();
  const cropImgRef    = useRef();
  const cropCanvasRef = useRef();
  const STAGE_W = 380;
  const STAGE_H = 380;
  const CIRCLE_R = 150;

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

  /* ── crop helpers ───────────────────────────────── */
  const openCrop = (file, target) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target.result);
      setCropFile(file);
      setCropTarget(target);
      setImgScale(1);
      setMinZoom(1);
      setImgOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const closeCrop = () => {
    setCropSrc(null);
    setCropFile(null);
    setCropTarget(null);
    if (fileRef.current)         fileRef.current.value = "";
    if (overviewFileRef.current) overviewFileRef.current.value = "";
  };

  const onCropImgLoad = (e) => {
    const img = e.target;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImgNatural({ w: nw, h: nh });
    // Scale so the ENTIRE image fits inside the stage — user sees the whole image first
    const fitScale = Math.min(STAGE_W / nw, STAGE_H / nh);
    setMinZoom(fitScale);
    setImgScale(fitScale);
    setImgOffset({ x: 0, y: 0 });
  };

  const onStageMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, ox: imgOffset.x, oy: imgOffset.y });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    setImgOffset({
      x: dragStart.ox + (e.clientX - dragStart.mx),
      y: dragStart.oy + (e.clientY - dragStart.my),
    });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const getRenderedSize = useCallback(() => {
    if (!imgNatural.w) return { w: STAGE_W, h: STAGE_H };
    return { w: imgNatural.w * imgScale, h: imgNatural.h * imgScale };
  }, [imgNatural, imgScale]);

  const getCroppedBlob = () => new Promise((resolve) => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !imgNatural.w) return resolve(null);
    const OUTPUT = 400;
    canvas.width  = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const rendered = getRenderedSize();
    const stageCx  = STAGE_W / 2;
    const stageCy  = STAGE_H / 2;
    const imgLeft  = stageCx + imgOffset.x - rendered.w / 2;
    const imgTop   = stageCy + imgOffset.y - rendered.h / 2;
    const circleLeft = stageCx - CIRCLE_R;
    const circleTop  = stageCy - CIRCLE_R;
    const scaleBack  = imgNatural.w / rendered.w;
    const sx = (circleLeft - imgLeft) * scaleBack;
    const sy = (circleTop  - imgTop)  * scaleBack;
    const sw = (CIRCLE_R * 2) * scaleBack;
    const sh = (CIRCLE_R * 2) * scaleBack;

    const imgEl = new window.Image();
    imgEl.onload = () => {
      ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, OUTPUT, OUTPUT);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    };
    imgEl.src = cropSrc;
  });

  const handleCropDone = async () => {
    const blob = await getCroppedBlob();
    if (!blob) return;
    const croppedFile = new File([blob], cropFile?.name || "photo.jpg", { type: "image/jpeg" });
    const preview = URL.createObjectURL(blob);

    if (cropTarget === "overview") {
      setPhotoPreview(preview);
      closeCrop();
      try {
        const fd = new FormData();
        fd.append("first_name",    profile.first_name || "");
        fd.append("last_name",     profile.last_name  || "");
        fd.append("email",         profile.email      || "");
        fd.append("phone_no",      profile.phone_no   || "");
        fd.append("address",       profile.address    || "");
        fd.append("profile_photo", croppedFile);
        const res = await api.put("/profile", fd);
        setProfile(res.data);
        syncForm(res.data);
        updateProfilePhoto(res.data.profile_photo ? `${BASE_URL}/${res.data.profile_photo}` : null);
        toast.success("Profile photo updated");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to update photo");
        setPhotoPreview(profile.profile_photo ? `${BASE_URL}/${profile.profile_photo}` : null);
      }
    } else {
      setPhotoPreview(preview);
      setForm((f) => ({ ...f, profile_photo: croppedFile }));
      closeCrop();
    }
  };

  /* ── photo actions ──────────────────────────────── */
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCrop(file, "edit");
    e.target.value = "";
  };

  const handleOverviewPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCrop(file, "overview");
    e.target.value = "";
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    try {
      await api.delete("/profile/photo");
      setPhotoPreview(null);
      setForm((f) => ({ ...f, profile_photo: null }));
      setProfile((p) => ({ ...p, profile_photo: null }));
      updateProfilePhoto(null);
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
      updateProfilePhoto(res.data.profile_photo ? `${BASE_URL}/${res.data.profile_photo}` : null);
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
    setShowLogoutModal(false);
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

      {/* ── Crop Modal — rendered outside pf-page so fixed overlay covers full screen ── */}
      {cropSrc && (() => {
        const rendered = getRenderedSize();
        const imgStyle = {
          width:         rendered.w,
          height:        rendered.h,
          transform:     `translate(calc(-50% + ${imgOffset.x}px), calc(-50% + ${imgOffset.y}px))`,
          position:      "absolute",
          top:           "50%",
          left:          "50%",
          pointerEvents: "none",
          userSelect:    "none",
        };
        const maxZoom = Math.max(minZoom * 4, 3);
        return (
          <div
            className="pf-crop-overlay"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div className="pf-crop-modal">
              <div className="pf-crop-header">
                <Crop size={18} className="pf-crop-header-icon" />
                <span>Crop Profile Photo</span>
              </div>
              <p className="pf-crop-hint">Drag image to reposition &nbsp;&middot;&nbsp; use slider to zoom in</p>

              <div
                ref={stageRef}
                className="pf-crop-stage"
                style={{ width: STAGE_W, height: STAGE_H, cursor: dragging ? "grabbing" : "grab" }}
                onMouseDown={onStageMouseDown}
              >
                <img ref={cropImgRef} src={cropSrc} alt="crop" style={imgStyle} onLoad={onCropImgLoad} />
                <svg
                  width={STAGE_W} height={STAGE_H}
                  style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                  <defs>
                    <mask id="pf-circle-hole">
                      <rect width={STAGE_W} height={STAGE_H} fill="white" />
                      <circle cx={STAGE_W / 2} cy={STAGE_H / 2} r={CIRCLE_R} fill="black" />
                    </mask>
                  </defs>
                  <rect width={STAGE_W} height={STAGE_H} fill="rgba(0,0,0,0.6)" mask="url(#pf-circle-hole)" />
                  <circle cx={STAGE_W / 2} cy={STAGE_H / 2} r={CIRCLE_R}
                    fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeDasharray="6 3" />
                  <circle cx={STAGE_W / 2} cy={STAGE_H / 2} r={CIRCLE_R}
                    fill="none" stroke="#8b3a3a" strokeWidth="1" strokeOpacity="0.5" />
                </svg>
              </div>

              <div className="pf-crop-zoom-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <input
                  type="range"
                  className="pf-crop-slider"
                  min={minZoom}
                  max={maxZoom}
                  step={minZoom * 0.01}
                  value={imgScale}
                  onChange={(e) => setImgScale(parseFloat(e.target.value))}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>

              <canvas ref={cropCanvasRef} style={{ display: "none" }} />

              <div className="pf-crop-actions">
                <button type="button" className="pf-crop-btn pf-crop-btn--confirm" onClick={handleCropDone}>
                  <Crop size={15} /> Crop &amp; Save
                </button>
                <button type="button" className="pf-crop-btn pf-crop-btn--cancel" onClick={closeCrop}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
              <button
                type="button"
                className="pf-photo-overlay"
                onClick={() => overviewFileRef.current?.click()}
                title="Change photo"
              >
                <Camera size={18} />
                <span>Change</span>
              </button>
              <input
                ref={overviewFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleOverviewPhotoChange}
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
            <button type="button" className="pf-btn pf-btn--action" onClick={openEdit}>
              <Edit3 size={15} /> Edit Profile
            </button>
            <button type="button" className="pf-btn pf-btn--action" onClick={openPwd}>
              <Lock size={15} /> Change Password
            </button>
            <button type="button" className="pf-btn pf-btn--action" onClick={() => setShowLogoutModal(true)}>
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
                
              </div>
              
            </div>

            <form onSubmit={handleSave} className="pf-form">
              <div className="pf-form-grid">
                <div className="pf-field pf-field--full">
                  <label>Profile Photo</label>
                  <div className="pf-photo-upload-wrap">
                    <label className="pf-photo-upload" htmlFor="profile-photo-input">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile preview" className="pf-photo-upload-img" />
                      ) : (
                        <div className="pf-photo-upload-placeholder">
                          <Camera size={24} />
                          <span>Choose</span>
                        </div>
                      )}
                    </label>
                    <input
                      id="profile-photo-input"
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="pf-photo-upload-input"
                    />
                  </div>
                  <span className="pf-hint">JPEG / PNG / WEBP · max 5 MB</span>
                </div>
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

      </div>{/* end pf-page */}

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onLogout={handleLogout}
      />
    </DashboardLayout>
  );
}
