// src/screens/Customer/Profile.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FiSettings, FiMessageSquare, FiTag, FiLogOut, FiUser, FiMail, FiShield } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

export default function Profile() {
  const { user, loading, isAuthenticated, logout, requireAuth } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    requireAuth();
  }, [isAuthenticated, requireAuth]);

  if (loading) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  const recently = [
    { id: 1, src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop" },
    { id: 2, src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop" },
    { id: 3, src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop" },
    { id: 4, src: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop" },
    { id: 5, src: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop" },
  ];

  // Ảnh demo cho strip “Quản lý sản phẩm”
  const manageThumbs = [
    "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=600&h=600&fit=crop",
  ];

  // Gợi ý sản phẩm phía dưới
  const products = [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=800&fit=crop",
    "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=600&h=800&fit=crop",
    "https://images.unsplash.com/photo-1520975594081-4327b2e5a6df?w=600&h=800&fit=crop",
    "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=600&h=800&fit=crop",
  ];

  const onImgError = (e) => {
    e.currentTarget.src =
      "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=600&h=600&fit=crop";
  };

  return (
    <div style={s.page}>
      <div style={{ height: 10 }} />

      <header style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={s.avatarContainer}>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=200`}
              alt={`${user.name} avatar`}
              style={s.avatar}
            />
            {user.email_verified && (
              <div style={s.verifiedBadge} title="Verified Account">
                <FiShield size={12} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.hello}>
              Xin chào, <strong>{user.name}!</strong>
            </div>
            <div style={s.userInfo}>
              <FiMail size={12} style={{ color: "#64748b" }} />
              <span style={s.email}>{user.email}</span>
            </div>
            <div style={s.userRole}>
              <span style={s.roleBadge}>{user.role}</span>
            </div>
          </div>
        </div>

        <div style={s.headerIcons}>
          <Link to="/chat-list" aria-label="Chat" style={s.iconBtn} title="Chat">
            <FiMessageSquare size={18} style={{ display: "block", color: "inherit" }} />
          </Link>
          <IconBtn label="Mã giảm giá">
            <FiTag size={18} style={{ display: "block", color: "inherit" }} />
          </IconBtn>
          <Link to="/settings" aria-label="Cài đặt" style={s.iconBtn} title="Cài đặt">
            <FiSettings size={18} style={{ display: "block", color: "inherit" }} />
          </Link>
          <button onClick={logout} aria-label="Đăng xuất" style={s.logoutBtn} title="Đăng xuất">
            <FiLogOut size={18} style={{ display: "block", color: "inherit" }} />
          </button>
        </div>
      </header>

      {/* User Stats */}
      <section style={{ padding: "0 16px", marginTop: 14 }}>
        <div style={s.card}>
          <div style={s.badge}>
            <span aria-hidden>�</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.cardTitle}>
              Chào mừng {user.name} đến với ReVibe!
            </div>
            <div style={s.cardText}>
              {user.email_verified 
                ? "Tài khoản của bạn đã được xác minh. Bắt đầu khám phá ngay!"
                : "Vui lòng xác minh email để sử dụng đầy đủ tính năng."
              }
            </div>
          </div>
          {!user.email_verified ? (
            <Link to="/auth/verify-email" style={s.ctaMini}>
              Xác minh
            </Link>
          ) : (
            <button style={s.ctaMini}>Khám phá</button>
          )}
        </div>
      </section>

      {/* Account Info */}
      <section style={{ padding: "0 16px", marginTop: 18 }}>
        <h3 style={s.sectionTitle}>Thông tin tài khoản</h3>
        <div style={s.accountGrid}>
          <div style={s.accountItem}>
            <div style={s.accountIcon}>
              <FiUser size={16} />
            </div>
            <div>
              <div style={s.accountLabel}>Họ tên</div>
              <div style={s.accountValue}>{user.name}</div>
            </div>
          </div>
          <div style={s.accountItem}>
            <div style={s.accountIcon}>
              <FiMail size={16} />
            </div>
            <div>
              <div style={s.accountLabel}>Email</div>
              <div style={s.accountValue}>{user.email}</div>
            </div>
          </div>
          <div style={s.accountItem}>
            <div style={s.accountIcon}>
              <FiShield size={16} />
            </div>
            <div>
              <div style={s.accountLabel}>Vai trò</div>
              <div style={s.accountValue}>
                <span style={s.roleBadge}>{user.role}</span>
              </div>
            </div>
          </div>
          <div style={s.accountItem}>
            <div style={{
              ...s.accountIcon,
              background: user.email_verified ? "#f0fdf4" : "#fef2f2",
              color: user.email_verified ? "#22c55e" : "#dc2626",
            }}>
              <FiShield size={16} />
            </div>
            <div>
              <div style={s.accountLabel}>Trạng thái</div>
              <div style={s.accountValue}>
                <span style={{
                  ...s.roleBadge,
                  background: user.email_verified ? "#f0fdf4" : "#fef2f2",
                  color: user.email_verified ? "#22c55e" : "#dc2626",
                  border: user.email_verified ? "1px solid #bbf7d0" : "1px solid #fecaca",
                }}>
                  {user.email_verified ? "Đã xác minh" : "Chưa xác minh"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently viewed */}
      <section style={{ padding: "0 16px", marginTop: 18 }}>
        <h3 style={s.sectionTitle}>Mới xem</h3>
        <div style={s.avatarRow}>
          {recently.map((u) => (
            <img key={u.id} src={u.src} alt="" style={s.avatarCircle} onError={onImgError} />
          ))}
        </div>
      </section>

      {/* Đơn hàng */}
      <section style={{ padding: "0 16px", marginTop: 18 }}>
        <h3 style={s.sectionTitle}>Quản lý đơn hàng</h3>
        <div style={s.orderRow}>
          <Link to="/orders?role=buyer&status=to_pay" style={s.statusBtn}>
            <span>📦</span> Đã mua
          </Link>
          <Link to="/orders?role=seller" style={s.statusBtn}>
            <span>💼</span> Đã bán
          </Link>
          <Link to="/orders?status=pending" style={s.statusBtn}>
            <span>⏳</span> Chờ xử lý
          </Link>
          <Link to="/orders?status=completed" style={s.statusBtn}>
            <span>✅</span> Hoàn thành
          </Link>
        </div>
      </section>

      {/* Quản lý sản phẩm (strip ảnh, link tới /mylist để khớp ListingMine) */}
      <section style={{ padding: "0 16px", marginTop: 18 }}>
        <h3 style={s.sectionTitle}>Quản lý sản phẩm</h3>
        <Link to="/mylist" style={s.manageStrip} aria-label="Tới trang Sản phẩm của tôi">
          {manageThumbs.map((src, i) => (
            <span key={i} style={s.thumbWrap}>
              <img src={src} alt="" style={s.thumbRounded} onError={onImgError} />
            </span>
          ))}
        </Link>
      </section>

      {/* Gợi ý */}
      <section style={{ padding: "0 16px", marginTop: 18, marginBottom: 90 }}>
        <h3 style={s.sectionTitle}>Có thể bạn sẽ thích</h3>
        <div style={s.grid}>
          {products.map((src, i) => (
            <div key={i} style={s.cardImgWrap}>
              <img src={src} alt="" style={s.cardImg} onError={onImgError} />
            </div>
          ))}
        </div>
      </section>

      {/* bottom nav */}
      <nav style={s.nav}>
        <NavItem active>🏠</NavItem>
        <NavItem>💙</NavItem>
        <NavItem>📦</NavItem>
        <NavItem>🔔</NavItem>
        <NavItem>👤</NavItem>
      </nav>
    </div>
  );
}

function IconBtn({ children, label }) {
  return (
    <button type="button" aria-label={label} title={label} style={s.iconBtn}>
      {children}
    </button>
  );
}

function NavItem({ children, active }) {
  return (
    <button type="button" style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
      {children}
    </button>
  );
}

/* styles */
const s = {
  page: {
    minHeight: "100dvh",
    maxWidth: 420,
    margin: "0 auto",
    background: "#f5f7ff",
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    alignItems: "flex-start",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  avatarContainer: {
    position: "relative",
    width: 50,
    height: 50,
    flexShrink: 0,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 999, 
    objectFit: "cover",
    border: "3px solid #fff",
    boxShadow: "0 4px 12px rgba(0,0,0,.1)",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 999,
    background: "#22c55e",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  hello: { 
    fontSize: 18, 
    color: "#0f172a", 
    marginBottom: 4,
    fontWeight: 600,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  email: {
    fontSize: 13,
    color: "#64748b",
  },
  userRole: {
    display: "flex",
    alignItems: "center",
  },
  roleBadge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 12,
    background: "#eef2ff",
    color: "#2563eb",
    fontWeight: 600,
    textTransform: "capitalize",
    border: "1px solid #ddd6fe",
  },
  headerIcons: { display: "flex", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#eef2ff",
    border: "1px solid #e5e7eb",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  	lineHeight: 0,
    verticalAlign: "middle",
    cursor: "pointer",
    color: "#0f172a",
    transition: "all 0.2s",
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#dc2626",
    transition: "all 0.2s",
  },

  card: {
    display: "flex",
    gap: 12,
    padding: 14,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    alignItems: "center",
    boxShadow: "0 6px 18px rgba(31,41,55,.06)",
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "#eaf1ff",
    color: "#2563eb",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    flex: "0 0 48px",
  },
  cardTitle: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  cardText: { fontSize: 13, color: "#475569", lineHeight: 1.35 },
  ctaMini: {
    padding: "8px 12px",
    borderRadius: 12,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  // Account Info Styles
  accountGrid: {
    display: "grid",
    gap: 12,
  },
  accountItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#eef2ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accountLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
    marginBottom: 2,
  },
  accountValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 600,
  },

  sectionTitle: { margin: "0 0 10px 0", fontSize: 16, fontWeight: 700 },

  avatarRow: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 999,
    objectFit: "cover",
    border: "3px solid #fff",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)",
  },

  /* Đơn hàng */
  orderRow: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 2,
  },
  statusBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 44,
    padding: "0 14px",
    minWidth: 100,
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
    color: "#0f172a",
    background: "#fff",
    border: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    justifyContent: "center",
  },

  /* Quản lý sản phẩm: strip ảnh click được (link /mylist) */
  manageStrip: {
    display: "flex",
    gap: 12,
    textDecoration: "none",
    padding: 6,
    borderRadius: 16,
    background: "transparent",
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    overflow: "hidden",
    background: "#e5e7eb",
    flex: "0 0 84px",
    boxShadow: "0 6px 16px rgba(0,0,0,.08)",
  },
  thumbRounded: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  /* Gợi ý */
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  cardImgWrap: {
    width: "100%",
    aspectRatio: "3/4",
    borderRadius: 14,
    overflow: "hidden",
    background: "#e5e7eb",
  },
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  /* bottom nav */
  nav: {
    position: "fixed",
    left: "50%",
    bottom: 12,
    transform: "translateX(-50%)",
    width: "min(420px, 95vw)",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
    background: "#fff",
    padding: 10,
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
    border: "1px solid #e5e7eb",
  },
  navItem: {
    height: 42,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 18,
    cursor: "pointer",
  },
  navItemActive: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
};
