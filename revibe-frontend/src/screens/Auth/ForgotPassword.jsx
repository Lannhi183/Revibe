import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const emailRef = useRef(null);
  const errRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const canSubmit = emailValid && !loading;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          purpose: "reset_password",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Failed to send OTP");
        setLoading(false);
        requestAnimationFrame(() => errRef.current?.focus());
        return;
      }

      setSuccess("OTP sent! Please check your email.");
      setTimeout(() => {
        nav("/auth/reset-password", { state: { email: email.trim() } });
      }, 2000);
    } catch (error) {
      setLoading(false);
      setErr("Network error. Please check your connection.");
      requestAnimationFrame(() => errRef.current?.focus());
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.frame}>
        <div style={s.inner}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={s.logoDot} />
            <strong style={s.brand}>REVIBE</strong>
          </div>

          <div style={{ marginTop:12 }}>
            <h1 style={s.h1}>Forgot Password</h1>
            <p style={s.p}>
              Enter your email to receive OTP <span aria-hidden="true">🔑</span>
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

          <form onSubmit={submit} style={{ marginTop:16, display:"grid", gap:12 }}>
            <div>
              <label htmlFor="email" style={s.label}>Email</label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={email && !emailValid}
                style={{
                  ...s.input,
                  borderColor: email && !emailValid ? "#fecaca" : "transparent",
                  background: email && !emailValid ? "#fff1f2" : s.input.background,
                }}
              />
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
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>

          <div style={{ marginTop:20, textAlign:"center" }}>
            <Link to="/auth/login" style={s.link}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
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
  logoDot: { width: 10, height: 10, borderRadius: 999, background: "#2563eb" },
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
  primary: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: 14,
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "0.2px",
    transition: "all 0.2s",
  },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 500 },
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
