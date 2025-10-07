import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function ResetPassword() {
  const nav = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const otpRef = useRef(null);
  const errRef = useRef(null);

  useEffect(() => {
    if (!emailFromState) {
      setErr("No email provided. Please start from forgot password.");
    } else {
      otpRef.current?.focus();
    }
  }, [emailFromState]);

  const pwdMatch = newPassword === confirmPassword && newPassword.length >= 6;
  const canSubmit = email && otp.length >= 4 && pwdMatch && !loading;

  const handleCaps = (e) => setCaps(Boolean(e.getModifierState?.("CapsLock")));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Reset password failed");
        setLoading(false);
        requestAnimationFrame(() => errRef.current?.focus());
        return;
      }

      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        nav("/auth/login", { replace: true });
      }, 2000);
    } catch (error) {
      setLoading(false);
      setErr("Network error. Please check your connection.");
      requestAnimationFrame(() => errRef.current?.focus());
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.frame} role="region" aria-label="Reset Password panel">
        <BgBlobs />
        <div style={s.inner}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={s.logoDot} aria-hidden="true" />
            <strong style={s.brand}>REVIBE</strong>
          </div>

          <div style={{ marginTop: 12 }}>
            <h1 style={s.h1}>Reset Password</h1>
            <p style={s.p}>
              Enter OTP and set new password <span aria-hidden="true">🔐</span>
            </p>
          </div>

          {err && (
            <div ref={errRef} tabIndex={-1} aria-live="assertive" style={s.error}>
              {err}
            </div>
          )}

          {success && (
            <div aria-live="polite" style={s.success}>
              {success}
            </div>
          )}

          <form
            onSubmit={submit}
            style={{ marginTop: 16, display: "grid", gap: 12 }}
            noValidate
          >
            <div>
              <label htmlFor="email" style={s.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!emailFromState}
                style={{
                  ...s.input,
                  opacity: emailFromState ? 0.7 : 1,
                  cursor: emailFromState ? "not-allowed" : "text",
                }}
              />
            </div>

            <div>
              <label htmlFor="otp" style={s.label}>
                OTP Code
              </label>
              <input
                id="otp"
                name="otp"
                ref={otpRef}
                type="text"
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                enterKeyHint="next"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                style={{
                  ...s.input,
                  fontSize: 20,
                  letterSpacing: 6,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label htmlFor="newPassword" style={s.label}>
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type={showPwd ? "text" : "password"}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                enterKeyHint="next"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyUp={handleCaps}
                onKeyDown={handleCaps}
                required
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                style={s.eye}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
              {newPassword && newPassword.length < 6 && (
                <small style={{ ...s.help, color: "#dc2626" }}>
                  Password must be at least 6 characters
                </small>
              )}
              {caps && (
                <small style={{ ...s.help, color: "#b45309" }}>
                  Caps Lock is on
                </small>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" style={s.label}>
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPwd ? "text" : "password"}
                placeholder="Re-enter password"
                autoComplete="new-password"
                enterKeyHint="go"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  ...s.input,
                  borderColor: confirmPassword && !pwdMatch ? "#fecaca" : "transparent",
                  background: confirmPassword && !pwdMatch ? "#fff1f2" : s.input.background,
                }}
              />
              {confirmPassword && !pwdMatch && (
                <small style={{ ...s.help, color: "#dc2626" }}>
                  Passwords do not match
                </small>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...s.primary,
                opacity: canSubmit ? 1 : 0.6,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link to="/auth/forgot-password" style={s.link}>
              ← Resend OTP
            </Link>
          </div>
        </div>
        <div
          style={{
            height: 6,
            width: 96,
            background: "#e5e7eb",
            borderRadius: 999,
            margin: "16px auto 8px",
          }}
        />
      </div>
    </div>
  );
}

function BgBlobs() {
  return (
    <svg
      viewBox="0 0 390 844"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d="M0 0h220c40 80-30 140-120 120S0 100 0 0Z" fill="#fde7ed" />
      <path
        d="M0 -24h220c40 80-30 140-120 120S0 100 0 -24Z"
        fill="#ec4899"
        opacity=".35"
      />
      <ellipse cx="345" cy="250" rx="36" ry="56" fill="#db2777" opacity=".9" />
      <path
        d="M0 540c60 30 130 40 220 10s140-5 170 18v276H0V540Z"
        fill="#fde7ed"
      />
    </svg>
  );
}

const s = {
  wrap: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: 16,
    fontFamily: "'Inter',sans-serif",
  },
  frame: {
    position: "relative",
    width: 400,
    maxWidth: "95vw",
    background: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 18px 50px rgba(0,0,0,.35)",
  },
  inner: { position: "relative", zIndex: 1, padding: "40px 24px 16px" },
  logoDot: { width: 10, height: 10, borderRadius: 999, background: "#ec4899" },
  brand: { fontFamily: "'Montserrat',sans-serif", letterSpacing: "1px" },
  h1: {
    margin: "8px 0 2px",
    fontSize: 36,
    lineHeight: 1.1,
    color: "#0f172a",
    fontFamily: "'Montserrat',sans-serif",
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  p: { margin: 0, color: "#475569", fontSize: 15 },
  label: {
    display: "block",
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    width: "100%",
    background: "#f1f5f9",
    border: "1px solid transparent",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 15,
    outline: "none",
    transition: "all 0.2s",
  },
  help: {
    display: "block",
    marginTop: 6,
    fontSize: 12,
    minHeight: 16,
  },
  eye: {
    position: "absolute",
    top: 26,
    right: 6,
    border: "none",
    background: "transparent",
    fontSize: 18,
    padding: 6,
    cursor: "pointer",
  },
  primary: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: 14,
    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "0.2px",
    transition: "all 0.2s",
  },
  link: {
    color: "#ec4899",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: 14,
  },
  error: {
    whiteSpace: "pre-wrap",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    marginTop: 12,
  },
  success: {
    whiteSpace: "pre-wrap",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    marginTop: 12,
  },
};
