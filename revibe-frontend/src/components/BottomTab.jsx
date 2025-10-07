import { Link, useLocation } from "react-router-dom";

const active = (path, cur) =>
  cur.startsWith(path) ? { color: "#2563eb" } : undefined;

export default function BottomTab() {
  const { pathname } = useLocation();

  return (
    <nav style={tab}>
      <Link to="/home" style={{ ...tabItem, ...active("/home", pathname) }}>
        <div style={tabIcon}>🏠</div>
        <div style={tabText}>Trang chủ</div>
      </Link>

      <Link
        to="/notifications"
        style={{ ...tabItem, ...active("/notifications", pathname) }}
      >
        <div style={tabIcon}>🔔</div>
        <div style={tabText}>Thông báo</div>
      </Link>

      <Link to="/sell/new" style={tabPlus} aria-label="Đăng bán">＋</Link>

      <Link to="/cart" style={{ ...tabItem, ...active("/cart", pathname) }}>
        <div style={tabIcon}>🛒</div>
        <div style={tabText}>Giỏ hàng</div>
      </Link>

      <Link to="/profile" style={{ ...tabItem, ...active("/profile", pathname) }}>
        <div style={tabIcon}>👤</div>
        <div style={tabText}>Hồ sơ</div>
      </Link>
    </nav>
  );
}

/* styles */
const tab = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: `calc(10px + env(safe-area-inset-bottom))`,
  width: "min(430px, 92%)",
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,.15)",
  padding: "8px 10px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
  alignItems: "center",
  zIndex: 50,
};
const tabItem = { display: "grid", justifyItems: "center", gap: 2, textDecoration: "none", color: "#0f172a", fontSize: 12 };
const tabIcon = { fontSize: 20 };
const tabText = { fontSize: 11, opacity: .8 };
const tabPlus = {
  justifySelf: "center",
  width: 46, height: 46, borderRadius: "50%",
  background: "#2563eb", color: "#fff",
  display: "grid", placeItems: "center",
  fontSize: 28, textDecoration: "none",
  boxShadow: "0 8px 16px rgba(37,99,235,.4)"
};