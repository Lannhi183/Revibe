import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const nameRef = useRef(null);
  const errRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const pwdMatch = password === confirm && password.length >= 6;
  const canSubmit = name.trim() && emailValid && pwdMatch && !loading;

  const handleCaps = (e) => setCaps(Boolean(e.getModifierState?.("CapsLock")));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Registration failed");
        setLoading(false);
        requestAnimationFrame(() => errRef.current?.focus());
        return;
      }

      setSuccess("Account created! Please check your email for OTP verification.");
      setTimeout(() => {
        nav("/auth/verify-email", { state: { email: email.trim() } });
      }, 2000);
    } catch (error) {
      setLoading(false);
      setErr("Network error. Please check your connection.");
      requestAnimationFrame(() => errRef.current?.focus());
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.frame} role="region" aria-label="Register panel">
        <BgBlobs />
        <div style={s.inner}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={s.logoDot} aria-hidden="true" />
            <strong style={s.brand}>REVIBE</strong>
          </div>

          <div style={{marginTop:12}}>
            <h1 style={s.h1}>Register</h1>
            <p style={s.p}>Create a new account</p>
          </div>

          {err && (
            <div ref={errRef} tabIndex={-1} aria-live="assertive" style={s.error}>{err}</div>
          )}

          <form onSubmit={submit} style={{marginTop:16, display:"grid", gap:12}} noValidate>
            <div>
              <label htmlFor="name" style={s.label}>Full name</label>
              <input
                id="name" name="name"
                type="text" placeholder="Your name"
                value={name} onChange={e=>setName(e.target.value)} required
                style={s.input}
              />
            </div>

            <div>
              <label htmlFor="email" style={s.label}>Email</label>
              <input
                id="email" 
                name="email"
                type="email" 
                placeholder="you@example.com"
                autoComplete="email" 
                inputMode="email" 
                spellCheck={false}
                enterKeyHint="next"
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
              {email && !emailValid && (
                <small style={{ ...s.help, color: "#dc2626" }}>
                  Please enter a valid email
                </small>
              )}
            </div>

            <div style={{position:"relative"}}>
              <label htmlFor="password" style={s.label}>Password</label>
              <input
                id="password" name="password"
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyUp={handleCaps} onKeyDown={handleCaps}
                required
                style={{...s.input, paddingRight:44}}
              />
              <button type="button" onClick={()=>setShowPwd(v=>!v)} style={s.eye}>
                {showPwd ? "🙈" : "👁️"}
              </button>
              {caps && <small style={{...s.help, color:"#b45309"}}>Caps Lock đang bật</small>}
            </div>

            <div>
              <label htmlFor="confirm" style={s.label}>Confirm password</label>
              <input
                id="confirm" name="confirm"
                type={showPwd ? "text" : "password"}
                placeholder="Repeat password"
                autoComplete="new-password"
                value={confirm}
                onChange={e=>setConfirm(e.target.value)}
                required
                style={s.input}
              />
              {!pwdMatch && confirm && <small style={s.help}>Mật khẩu không khớp</small>}
            </div>

            <button type="submit" disabled={!canSubmit}
              style={{...s.primary, opacity: canSubmit ? 1 : .6}}>
              {loading ? "Đang đăng ký…" : "Sign up"}
            </button>

            <div style={{textAlign:"center", marginTop:8}}>
              <span style={{color:"#475569", fontSize:14}}>
                Already have an account?{" "}
                <Link to="/auth/login" style={s.link}>Log in</Link>
              </span>
            </div>
          </form>
        </div>
        <div style={{height:6, width:96, background:"#e5e7eb", borderRadius:999, margin:"16px auto 8px"}} />
      </div>
    </div>
  );
}

function BgBlobs(){
  return (
    <svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"
         style={{position:"absolute", inset:0, width:"100%", height:"100%"}} aria-hidden="true">
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d="M0 0h220c40 80-30 140-120 120S0 100 0 0Z" fill="#eaf1ff" />
      <path d="M0 -24h220c40 80-30 140-120 120S0 100 0 -24Z" fill="#3b82f6" opacity=".35"/>
      <ellipse cx="345" cy="250" rx="36" ry="56" fill="#2563eb" opacity=".9" />
      <path d="M0 540c60 30 130 40 220 10s140-5 170 18v276H0V540Z" fill="#f5f7ff" />
    </svg>
  );
}

const s = {
  wrap:{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",padding:16,fontFamily:"'Inter',sans-serif"},
  frame:{position:"relative",width:380,maxWidth:"95vw",background:"#fff",borderRadius:28,overflow:"hidden",boxShadow:"0 18px 50px rgba(0,0,0,.35)"},
  inner:{position:"relative",zIndex:1,padding:"40px 24px 16px"},
  logoDot:{width:10,height:10,borderRadius:999,background:"#2563eb"},
  brand:{fontFamily:"'Montserrat',sans-serif",letterSpacing:"1px"},
  h1:{margin:"8px 0 2px",fontSize:36,lineHeight:1.1,color:"#0f172a",fontFamily:"'Montserrat',sans-serif",fontWeight:700},
  p:{margin:0,color:"#475569",fontSize:15},
  label:{display:"block",fontSize:13,color:"#475569",marginBottom:6,fontWeight:500},
  input:{width:"100%",background:"#f1f5f9",border:"1px solid transparent",borderRadius:14,padding:"12px 14px",fontSize:15,outline:"none"},
  help:{display:"block",marginTop:6,fontSize:12,color:"#94a3b8"},
  eye:{position:"absolute",top:26,right:6,border:"none",background:"transparent",fontSize:18,padding:6,cursor:"pointer"},
  primary:{width:"100%",padding:"12px 14px",border:"none",borderRadius:14,background:"#2563eb",color:"#fff",fontWeight:600,fontSize:15},
  link:{color:"#2563eb",textDecoration:"none",fontWeight:500},
  error:{whiteSpace:"pre-wrap",background:"#fef2f2",border:"1px solid #fecaca",color:"#991b1b",padding:12,borderRadius:12,fontSize:13,marginTop:12},
};
