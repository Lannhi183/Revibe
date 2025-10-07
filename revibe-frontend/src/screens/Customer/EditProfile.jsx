// src/screens/Customer/EditProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiArrowLeft, FiLock, FiSave } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function EditProfile() {
  const nav = useNavigate();
  const { user, isAuthenticated, getAuthHeader, refreshAuth } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("https://ui-avatars.com/api/?name=User&background=2563eb&color=fff&size=200");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");



  useEffect(() => {

    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=2563eb&color=fff&size=200`);
    }
  }, [user, isAuthenticated, nav]);

  // validate
  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSave = name.trim() && emailValid && !saving;



  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setErr("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErr(data.error || "Failed to update profile");
        setSaving(false);
        return;
      }

      setSuccess(data.message || "Profile updated successfully!");
      
      // Refresh auth state để update user data trong localStorage
      await refreshAuth();
      
      setTimeout(() => {
        setSuccess("");
        // Nếu email thay đổi và cần verify, chuyển đến trang verify
        if (data.message && data.message.includes("verification")) {
          nav("/auth/verify-email", { state: { email: email.trim() } });
        }
      }, 2000);
    } catch (error) {
      setErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav(-1)} style={s.backBtn}>
          <FiArrowLeft size={20} />
        </button>
        <h1 style={s.h1}>Edit Profile</h1>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </header>

      {/* Avatar */}
      <div style={s.avatarWrap}>
        <img src={avatar} alt="Your avatar" style={s.avatar} />
      </div>

      {/* Messages */}
      {err && (
        <div style={s.error}>
          {err}
        </div>
      )}
      
      {success && (
        <div style={s.success}>
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} style={s.form} noValidate>
        <div style={s.field}>
          <label style={s.label}>Full Name</label>
          <input
            style={s.input}
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Email Address</label>
          <input
            style={{
              ...s.input,
              borderColor: email && !emailValid ? "#fecaca" : "transparent",
              background: email && !emailValid ? "#fff1f2" : s.input.background
            }}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
          />
          {email && !emailValid && (
            <small style={s.helpError}>Please enter a valid email address</small>
          )}
          <small style={s.help}>
            Note: Changing email will require verification and log you out.
          </small>
        </div>

        <div style={s.buttonGroup}>
          <button 
            type="submit" 
            disabled={!canSave} 
            style={{
              ...s.primary, 
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            <FiSave size={18} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Change Password Section */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          <FiLock size={20} />
          Bảo mật tài khoản
        </h3>
        <p style={s.sectionDesc}>
          Thay đổi mật khẩu để bảo vệ tài khoản của bạn
        </p>
        <Link to="/settings/change-password" style={s.secondaryBtn}>
          🔑 Đổi mật khẩu
        </Link>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

/* styles */
const s = {
  page: {
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    background: "#f8fafc",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
  },
  h1: { margin: 0, fontSize: 20, fontWeight: 700 },
  
  avatarWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 24,
    background: "#fff",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 999,
    objectFit: "cover",
    border: "4px solid #fff",
    boxShadow: "0 8px 24px rgba(0,0,0,.12)",
  },
  
  error: {
    margin: "16px 16px 0",
    padding: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#991b1b",
    fontSize: 14,
  },
  success: {
    margin: "16px 16px 0",
    padding: 12,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    fontSize: 14,
  },
  
  form: {
    padding: "16px 16px 0",
    background: "#fff",
    margin: "8px 0",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    fontSize: 16,
    outline: "none",
    background: "#f8fafc",
    transition: "all 0.2s",
  },
  help: {
    display: "block",
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  helpError: {
    display: "block",
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
  
  buttonGroup: {
    marginTop: 24,
    marginBottom: 16,
  },
  primary: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 16px",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    transition: "all 0.2s",
  },
  
  section: {
    margin: "8px 0",
    padding: 16,
    background: "#fff",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 8px 0",
    fontSize: 16,
    fontWeight: 600,
    color: "#374151",
  },
  sectionDesc: {
    margin: "0 0 16px 0",
    fontSize: 14,
    color: "#6b7280",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.2s",
  },

  avatarWrap:{marginTop:14, display:"grid", placeItems:"center"},
  avatar:{width:84,height:84,borderRadius:999,objectFit:"cover",boxShadow:"0 6px 18px rgba(0,0,0,.08)",border:"4px solid #eef2ff"},
  editBtn:{
    marginTop:-24, marginLeft:56,
    width:28,height:28,borderRadius:999,border:"none",
    background:"#2563eb",color:"#fff",display:"grid",placeItems:"center",
    boxShadow:"0 6px 16px rgba(37,99,235,.35)", cursor:"pointer"
  },

  form:{padding:"16px", display:"grid", gap:12},
  input:{
    width:"100%", background:"#eef2ff", border:"1px solid transparent",
    borderRadius:12, padding:"12px 14px", fontSize:15, outline:"none",
  },
  help:{fontSize:12, color:"#b45309", marginTop:-6, marginBottom:-2},
  primary:{
    marginTop:6, width:"100%", padding:"12px 14px",
    border:"none", borderRadius:12, background:"#2563eb",
    color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer",
  },
  toast:{
    marginTop:10, fontSize:13, color:"#16a34a",
    background:"#ecfdf5", border:"1px solid #bbf7d0",
    padding:"8px 10px", borderRadius:10, width:"fit-content"
  },
};
