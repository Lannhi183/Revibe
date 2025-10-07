// src/screens/Customer/ForYou.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

export default function ForYou() {
  const nav = useNavigate();

  /* ---------- money helpers ---------- */
  // prices are returned in VND from backend
  const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n ?? 0);

  /* ---------- filter & sort state ---------- */
  const [showFilter, setShowFilter] = useState(false);
  const [priceMin, setPriceMin] = useState(""); // VND
  const [priceMax, setPriceMax] = useState(""); // VND
  const [saleOnly, setSaleOnly] = useState(false);
  const [sort, setSort] = useState("relevance"); // relevance | priceAsc | priceDesc | discountDesc | popular
  const [search, setSearch] = useState("");

  const [items, setItems] = useState(PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buildHeaders = () => {
    return getAuthHeaders();
  };

  async function fetchListings() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      // By default, don't show the user's own listings
      qs.set("isYour", "false");
      if (search) qs.set("search", search);
      // support popularity sorting via views_desc
      if (sort === "popular") qs.set("sort", "views_desc");
      // other sorts can be handled client-side for now

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
          views: l.views || 0,
          created_at: l.created_at,
          status: l.status,
          attributes: l.attributes || {},
        }))
      );
    } catch (err) {
      setError(String(err.message || err));
      setItems(PRODUCTS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // fetch when component mounts and whenever search or sort changes
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const filtered = useMemo(() => {
    let list = (items || []).slice();

    // filter by price (VND)
    const minVnd = Number(priceMin) || 0;
    const maxVnd = Number(priceMax) || Infinity;
    list = list.filter((p) => {
      const vnd = Number(p.price || 0);
      return vnd >= minVnd && vnd <= maxVnd;
    });

    // sale only
    if (saleOnly) list = list.filter((p) => Number(p.off) > 0);

    // client-side sorts
    switch (sort) {
      case "priceAsc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "discountDesc":
        list.sort((a, b) => (b.off || 0) - (a.off || 0));
        break;
      case "popular":
        list.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      default:
        break; // relevance: keep server order
    }

    return list;
  }, [items, priceMin, priceMax, saleOnly, sort]);

  return (
    <div style={st.page}>
      {/* Header nền xanh dạng wave (ở dưới cùng, không nhận click) */}
      <div style={st.waveTop} />

      <header style={st.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => nav(-1)} style={st.back} aria-label="Quay lại">←</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
            <h1 style={st.title}>Dành riêng cho bạn</h1>
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
            onClick={() => setShowFilter(true)}
          >
            Bộ lọc
          </button>
        </div>
      </header>

      {/* trạng thái filter đang dùng (tóm tắt) */}
      <div style={st.activeRow}>
        {(priceMin || priceMax) && (
          <span style={st.pill}>
            Giá: {priceMin ? fmtVND(Number(priceMin)) : fmtVND(0)}–{priceMax ? fmtVND(Number(priceMax)) : "∞"}
          </span>
        )}
        {saleOnly && <span style={st.pill}>Đang giảm giá</span>}
        {sort !== "relevance" && (
          <span style={st.pill}>
            {sort === "priceAsc" ? "Giá ↑" : sort === "priceDesc" ? "Giá ↓" : "Giảm % nhiều"}
          </span>
        )}
        {!priceMin && !priceMax && !saleOnly && sort === "relevance" && (
          <span style={{ fontSize: 12, color: C.sub }}>Hiển thị theo đề xuất</span>
        )}
      </div>

      {/* Lưới 2 cột */}
      <div style={st.grid}>
        {(loading ? PRODUCTS : filtered).map((p) => (
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

      {/* ---------- Filter Drawer + Backdrop ---------- */}
      {showFilter && (
        <>
          <div style={st.backdrop} onClick={() => setShowFilter(false)} />
          <aside style={st.drawer}>
            <div style={st.drawerHead}>
              <b style={{ fontSize: 16 }}>Bộ lọc & Sắp xếp</b>
              <button style={st.icon} onClick={() => setShowFilter(false)} aria-label="Đóng">✕</button>
            </div>

            <div style={st.group}>
              <div style={st.label}>Khoảng giá (₫)</div>
              <div style={st.rangerow}>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Từ (VND)"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  style={st.input}
                />
                <span style={{ opacity: .6 }}>—</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Đến (VND)"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  style={st.input}
                />
              </div>
              {/* Quick ranges (VND) */}
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[200000, 300000, 400000].map((n) => (
                  <button
                    key={`lte-${n}`}
                    style={st.quick}
                    onClick={() => { setPriceMin(0); setPriceMax(n); }}
                  >
                    ≤ {fmtShortVND(n)}
                  </button>
                ))}
                {[300000, 500000, 700000].map((n) => (
                  <button
                    key={`gte-${n}`}
                    style={st.quick}
                    onClick={() => { setPriceMin(n); setPriceMax(""); }}
                  >
                    ≥ {fmtShortVND(n)}
                  </button>
                ))}
              </div>
            </div>

            <div style={st.group}>
              <label style={st.chkRow}>
                <input
                  type="checkbox"
                  checked={saleOnly}
                  onChange={(e) => setSaleOnly(e.target.checked)}
                />
                <span>Chỉ hiển thị sản phẩm đang giảm giá</span>
              </label>
            </div>

            <div style={st.group}>
              <div style={st.label}>Sắp xếp</div>
              <div style={st.sortRow}>
                {[
                  { id: "relevance", name: "Đề xuất" },
                  { id: "priceAsc", name: "Giá tăng dần" },
                  { id: "priceDesc", name: "Giá giảm dần" },
                  { id: "discountDesc", name: "Giảm % nhiều nhất" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    style={{ ...st.sortBtn, ...(sort === opt.id ? st.sortActive : {}) }}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={st.drawerFooter}>
              <button
                style={st.resetBtn}
                onClick={() => {
                  setPriceMin("");
                  setPriceMax("");
                  setSaleOnly(false);
                  setSort("relevance");
                }}
              >
                Reset
              </button>
              <button style={st.applyBtn} onClick={() => setShowFilter(false)}>
                Áp dụng
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
// Hiển thị rút gọn: 200.000₫ -> 200K, 1.500.000₫ -> 1.5M (để dùng trên quick buttons)
function fmtShortVND(n) {
  if (n >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1);
    return `${m}M₫`;
  }
  return `${Math.round(n / 1000)}K₫`;
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

  waveTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 132,
    background: `
      radial-gradient(120px 120px at 40px -20px, ${C.blueDeep} 150%, transparent 150%),
      radial-gradient(230px 160px at 150px -60px, ${C.blue} 90%, transparent 61%)
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

  activeRow: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    margin: "4px 0 10px",
  },
  pill: {
    background: "#eef2ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
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
  name: { fontSize: 13.5, lineHeight: 1.35, color: C.text, minHeight: 34 },
  priceRow: { display: "flex", gap: 8, alignItems: "baseline", marginTop: 6 },
  name: { fontSize: 13, lineHeight: 1.25, color: C.text, minHeight: 30 },
  price: { fontSize: 13, color: C.text },
  oldPrice: { textDecoration: "line-through", color: C.old, fontSize: 12 },

  /* Drawer + Backdrop */
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.32)",
    zIndex: 2000,
    backdropFilter: "blur(1px)",
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "min(360px, 92%)",
    background: "#fff",
    boxShadow: "-12px 0 30px rgba(0,0,0,.18)",
    zIndex: 2001,
    display: "flex",
    flexDirection: "column",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
    animation: "slideIn .22s ease",
  },
  drawerHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: `1px solid ${C.border}`,
  },
  icon: {
    width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
    background: "#fff", cursor: "pointer",
  },
  group: {
    padding: "12px 14px",
    borderBottom: `1px solid ${C.border}`,
  },
  label: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  rangerow: { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" },
  input: {
    height: 36,
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    padding: "0 10px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  quick: {
    height: 32,
    borderRadius: 999,
    border: `1px solid ${C.border}`,
    background: "#fff",
    padding: "0 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  chkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14 },

  sortRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  sortBtn: {
    height: 36,
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13.5,
  },
  sortActive: {
    background: "#eef2ff",
    borderColor: "#2563eb",
    boxShadow: "0 2px 8px rgba(37,99,235,.2)",
    color: "#1d4ed8",
    fontWeight: 700,
  },

  drawerFooter: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "12px 14px",
  },
  resetBtn: {
    height: 42,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  applyBtn: {
    height: 42,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
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

/* Keyframes (thêm vào global CSS nếu muốn mượt hơn)
@keyframes slideIn { from { transform: translateX(20%); opacity:.8 } to { transform: translateX(0); opacity:1 } }
*/
