import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function Settings() {
  const nav = useNavigate(); // <-- thêm

  const handleLogout = () => {
    // <-- thêm
    localStorage.removeItem("revibe_auth");
    nav("/auth/login", { replace: true });
  };

  const handleDelete = () => {
    // <-- thêm
    if (!window.confirm("Xóa tài khoản và đăng xuất?")) return;
    localStorage.clear();
    nav("/auth/login", { replace: true });
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link to="/profile" style={s.back} aria-label="Back">
          ←
        </Link>
        <h1 style={s.h1}>Settings</h1>
        <span style={{ width: 24 }} />
        {/* spacer */}
      </header>

      {/* PERSONAL */}
      <Section title="Personal">
        <Row to="/settings/edit-profile" label="Profile" />
        <Row to="/address" label="Shipping Address" />
        <Row to="/payment-methods" label="Payment methods" />
      </Section>

      {/* SHOP */}
      <Section title="Shop">
        <Row to="/settings/country" label="Country" value="Vietnam" />
        <Row to="/settings/currency" label="Currency" value="VND" />
        <Row to="/settings/sizes" label="Sizes" />
        <Row to="/settings/terms" label="Terms and Conditions" />
      </Section>

      {/* ACCOUNT */}
      <Section title="Account">
        <Row to="/settings/language" label="Language" value="English" />
        <Row to="/about" label="About Revibe" />
      </Section>

      <button type="button" style={s.danger} onClick={handleDelete}>
        Delete My Account
      </button>
      <button type="button" style={s.danger} onClick={handleLogout}>
        Log out
      </button>
      <div style={s.footer}>
        <div>Revibe</div>
        <small>Version 1.0 — June, 2025</small>
      </div>
    </div>
  );
}

/* sub components */
function Section({ title, children }) {
  return (
    <section style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <div style={s.card}>{children}</div>
    </section>
  );
}

function Row({ to = "#", label, value }) {
  return (
    <Link to={to} style={s.row}>
      <span>{label}</span>
      <span style={s.right}>
        {value && <span style={s.value}>{value}</span>}
        <span aria-hidden>›</span>
      </span>
    </Link>
  );
}

/* styles */
const s = {
  page: {
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    background: "#fff",
    fontFamily: "Inter,system-ui,sans-serif",
    color: "#111827",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "24px 1fr 24px",
    alignItems: "center",
    gap: 8,
    padding: "16px 12px",
    position: "sticky",
    top: 0,
    background: "#fff",
  },
  back: { textDecoration: "none", fontSize: 20, color: "#111827" },
  h1: { margin: 0, fontSize: 24 },
  section: { padding: "8px 12px" },
  sectionTitle: {
    margin: "12px 4px 8px",
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 700,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 14px",
    textDecoration: "none",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
  },
  right: { display: "flex", alignItems: "center", gap: 10, color: "#9ca3af" },
  value: { color: "#111827" },
  danger: {
    margin: "12px",
    padding: "12px 14px",
    width: "calc(100% - 24px)",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#dc2626",
    fontWeight: 600,
  },
  footer: { padding: "24px 12px 40px", color: "#6b7280" },
};
