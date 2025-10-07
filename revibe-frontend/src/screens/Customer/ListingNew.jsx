import React from "react";
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1"

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0)

export default function ListingNew() {
  const nav = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Money helpers (backend now returns price in VND)
  const buildHeaders = () => {
    return getAuthHeaders();
  };

  async function fetchListings() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      // request listings that are not yours (dev: backend requires auth)
      qs.set("isYour", "false");
      if (search) qs.set("search", search);
      const res = await fetch(`${API_BASE}/listings?${qs.toString()}`, {
        headers: buildHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Unauthorized — please login (dev fake-login) to fetch listings.");
        setItems([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && body.error) || `HTTP ${res.status}`);
      }
      const body = await res.json();
      const arr = Array.isArray(body) ? body : body.data ?? [];
      setItems(
        arr.map((l) => ({
          id: l._id || l.id,
          title: l.title,
          description: l.description,
          price: l.price || 0,
          img: (l.images && l.images[0]) || "/placeholder.svg",
          off: l.off || 0,
          old: l.old || null,
          created_at: l.created_at,
          status: l.status,
          attributes: l.attributes || {},
        }))
      );
    } catch (err) {
      setError(String(err.message || err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // fetch on mount and when search changes (debounced)
    const t = setTimeout(() => fetchListings(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div style={st.page}>
      {/* Header nền xanh dạng wave (ở dưới cùng, không nhận click) */}
      <div style={st.waveTop} />

      <header style={st.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => nav(-1)} style={st.back} aria-label="Quay lại">←</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
            <h1 style={st.title}>Mới cập nhật</h1>
            <input
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: 36, borderRadius: 10, padding: "0 10px", border: `1px solid ${C.border}`, flex: 1, minWidth: 100 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ ...st.filterBtn, minWidth: 110 }}
            aria-label="Bộ lọc"
          >
            Bộ lọc
          </button>
        </div>
      </header>

      {/* Lưới 2 cột */}
      <div style={st.grid}>
        {items.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} style={st.card}>
            <div style={{ position: "relative" }}>
              <div style={{ ...st.thumb, backgroundImage: `url(${p.img})` }} />
              {p.off ? <div style={st.badge}>-{p.off}%</div> : null}
            </div>

            <div style={st.body}>
              <div style={st.name}>{p.title}</div>
              <div style={st.priceRow}>
                <b style={st.price}>{fmtVND(p.price)}</b>
                {p.old && <span style={st.oldPrice}>{fmtVND(p.old)}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* chừa chỗ cho BottomTab / safe-area */}
      <div style={{ height: `calc(84px + env(safe-area-inset-bottom))` }} />
    </div>
  );
}

/* ---------- palette ---------- */
const C = {
  bg: "#F3F5F9",
  blue: "#2563EB",
  blueDeep: "#1E40FF",
  text: "#0F172A",
  sub: "#6B7280",
  card: "#FFFFFF",
  border: "#E5E7EB",
  shadow: "0 6px 18px rgba(16, 24, 40, .08)",
  badgeRed: "#EF4444",
  old: "#9CA3AF",
};

/* ---------- styles ---------- */
const st = {
  page: {
    width: "min(430px, 100%)",
    maxWidth: "100%",
    margin: "0 auto",
    padding: "0 12px 12px",
    boxSizing: "border-box",
    position: "relative",
    minHeight: "100dvh",
    background: C.bg,
    overflowX: "hidden",
  },

  // Wave xanh trên cùng (không nằm dưới <body>, chỉ trong khung trang)
  waveTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 132,
    background: `
      radial-gradient(120px 120px at 40px -20px, ${C.blueDeep} 60%, transparent 61%),
      radial-gradient(230px 160px at 150px -60px, ${C.blue} 60%, transparent 61%)
    `,
    zIndex: 0,
    pointerEvents: "none",
  },

  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  back: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.card,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(0,0,0,.03)",
  },
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: C.text },
  filterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.card,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(0,0,0,.03)",
  },

  grid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 12,
  },

  card: {
    display: "block",
    width: "100%",
    textDecoration: "none",
    color: "inherit",
    background: C.card,
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${C.border}`,
    boxShadow: C.shadow,
  },
  thumb: {
    height: 120,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "block",
  },
  badge: {
    position: "absolute",
    right: 8,
    top: 8,
    padding: "4px 8px",
    background: C.badgeRed,
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    boxShadow: "0 1px 0 rgba(0,0,0,.12)",
  },
  body: { padding: "10px 10px 12px" },
  priceRow: { display: "flex", gap: 8, alignItems: "baseline", marginTop: 6 },
  name: { fontSize: 13, lineHeight: 1.25, color: C.text, minHeight: 30 },
  price: { fontSize: 13, color: C.text },
  oldPrice: { textDecoration: "line-through", color: C.old, fontSize: 12 },
};

/* ---------- mock data ---------- */
const img = (q) => `https://images.unsplash.com/${q}?q=80&w=600&auto=format&fit=crop`;
const PRODUCTS = [
  { id: "p1", title: "Mũ rộng vành nữ",    price: 16, old: 20, off: 20, img: img("photo-1519741497674-611481863552") },
  { id: "p2", title: "Kính mát basic",     price: 16, old: 20, off: 20, img: img("photo-1513377883530-0ebd081a06a6") },
  { id: "p3", title: "Đầm hoa dịu dàng",   price: 16, old: 20, off: 20, img: img("photo-1490481651871-ab68de25d43d") },
  { id: "p4", title: "Guốc cao nhẹ nhàng", price: 16, old: 20, off: 20, img: img("photo-1520972792216-8bbfb546351a") },
  { id: "p5", title: "Túi xách nổi bật",   price: 16, old: 20, off: 20, img: img("photo-1542291026-7eec264c27ff") },
  { id: "p6", title: "Áo len cổ tròn",     price: 16, old: 20, off: 20, img: img("photo-1519744346366-1b64a702872e") },
];
