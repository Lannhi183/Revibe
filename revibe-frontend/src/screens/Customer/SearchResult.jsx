// src/screens/Customer/SearchResult.jsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const img = (q) =>
  `https://images.unsplash.com/${q}?q=80&w=600&auto=format&fit=crop`;

// mock data (thay bằng API nếu có)
const DATA = [
  { id: "p1", title: "Áo thun basic",  price: 7.5,  img: img("photo-1520975916090-3105956dac38"), off: 10 },
  { id: "p2", title: "Áo khoác denim", price: 26.9, img: img("photo-1520972792216-8bbfb546351a"), off: 20 },
  { id: "p3", title: "Đầm mùa hè",     price: 19.9, img: img("photo-1490481651871-ab68de25d43d"), off: 0  },
  { id: "p4", title: "Giày chạy bộ",   price: 29.0, img: img("photo-1519741497674-611481863552"), off: 15 },
  { id: "p5", title: "Sneakers casual",price: 24.0, img: img("photo-1525966222134-fcfa99b8ae77"), off: 5  },
  { id: "p6", title: "Giày thể thao",  price: 22.0, img: img("photo-1542291026-7eec264c27ff"),   off: 0  },
  { id: "p7", title: "Urban sneaks",   price: 28.0, img: img("photo-1519744346366-1b64a702872e"), off: 25 },
];

export default function SearchResult() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const qParam = params.get("q") || "";
  const cat = params.get("cat") || "";

  // --- Filter & Sort state ---
  const [showFilter, setShowFilter] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [saleOnly, setSaleOnly] = useState(false);
  const [sort, setSort] = useState("relevance"); // relevance | priceAsc | priceDesc | discountDesc

  const norm = (s) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const items = useMemo(() => {
    const nq = norm(qParam);
    let list = DATA.filter((p) => !nq || norm(p.title).includes(nq));

    // filter by price
    const min = Number(priceMin) || 0;
    const max = Number(priceMax) || Infinity;
    list = list.filter((p) => p.price >= min && p.price <= max);

    // sale only
    if (saleOnly) list = list.filter((p) => (p.off || 0) > 0);

    // sort
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
      default: // relevance
        break;
    }
    return list;
  }, [qParam, priceMin, priceMax, saleOnly, sort]);

  return (
    <div style={st.page}>
      <div style={st.wrap}>
        <header style={st.header}>
          <div>
            <div style={st.heading}>Kết quả cho “{qParam || "Tất cả"}”</div>
            <div style={st.sub}>{items.length} sản phẩm</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {cat && <div style={st.filterPill}>Danh mục: {cat}</div>}
            <button style={st.filterBtn} onClick={() => setShowFilter(true)} aria-label="Bộ lọc">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 5h18M6 12h12M10 19h4" stroke="#111827" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Tóm tắt filter đang bật */}
        <div style={st.activeRow}>
          {(priceMin || priceMax) && (
            <span style={st.pill}>Giá: {priceMin || 0}–{priceMax || "∞"}$</span>
          )}
          {saleOnly && <span style={st.pill}>Đang giảm giá</span>}
          {sort !== "relevance" && (
            <span style={st.pill}>
              {sort === "priceAsc" ? "Giá ↑" : sort === "priceDesc" ? "Giá ↓" : "Giảm % nhiều"}
            </span>
          )}
        </div>

        {/* Nội dung chiếm phần còn lại (fit mọi màn hình) */}
        <div style={st.content}>
          {items.length === 0 ? (
            <div style={st.empty}>
              Không tìm thấy kết quả phù hợp. Hãy thử từ khóa khác nhé.
            </div>
          ) : (
            <div style={st.grid}>
              {items.map((p) => (
                <Link to={`/product/${p.id}`} key={p.id} style={st.card}>
                  <div style={{ ...st.thumb, backgroundImage: `url(${p.img})` }} />
                  <div style={st.body}>
                    <div style={st.title}>{p.title}</div>
                    <div style={st.price}>${p.price.toFixed(2)}</div>
                  </div>
                  {p.off ? <div style={st.badge}>-{p.off}%</div> : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer + Backdrop */}
      {showFilter && (
        <>
          <div style={st.backdrop} onClick={() => setShowFilter(false)} />
          <aside style={st.drawer} role="dialog" aria-modal="true">
            <div style={st.drawerHead}>
              <b style={{ fontSize: 16 }}>Bộ lọc & Sắp xếp</b>
              <button style={st.icon} onClick={() => setShowFilter(false)} aria-label="Đóng">✕</button>
            </div>

            <div style={st.group}>
              <div style={st.label}>Khoảng giá ($)</div>
              <div style={st.rangerow}>
                <input
                  type="number" inputMode="decimal" placeholder="Từ"
                  value={priceMin} onChange={(e) => setPriceMin(e.target.value)} style={st.input}
                />
                <span style={{ opacity: .6 }}>—</span>
                <input
                  type="number" inputMode="decimal" placeholder="Đến"
                  value={priceMax} onChange={(e) => setPriceMax(e.target.value)} style={st.input}
                />
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[10, 20, 30].map((n) => (
                  <button key={n} style={st.quick} onClick={() => { setPriceMin(0); setPriceMax(n); }}>
                    &le; {n}$
                  </button>
                ))}
                {[20, 30, 40].map((n) => (
                  <button key={`gt-${n}`} style={st.quick} onClick={() => { setPriceMin(n); setPriceMax(""); }}>
                    &ge; {n}$
                  </button>
                ))}
              </div>
            </div>

            <div style={st.group}>
              <label style={st.chkRow}>
                <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
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
                onClick={() => { setPriceMin(""); setPriceMax(""); setSaleOnly(false); setSort("relevance"); }}
              >
                Reset
              </button>
              <button style={st.applyBtn} onClick={() => setShowFilter(false)}>Áp dụng</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/* ---------- styles (fit mọi màn hình & có filter) ---------- */
const st = {
  page: {
    position: "fixed",
    inset: 0,
    overflow: "auto",
    background: "#f8fafc",
    boxSizing: "border-box",
    paddingLeft: "max(0px, env(safe-area-inset-left))",
    paddingRight: "max(0px, env(safe-area-inset-right))",
    paddingBottom: "var(--bt-safe, calc(96px + env(safe-area-inset-bottom)))",
  },
  wrap: {
    width: "min(430px, 100%)",
    margin: "0 auto",
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    boxSizing: "border-box",
  },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 },
  heading: { fontWeight: 800, fontSize: 18, lineHeight: 1.2 },
  sub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  filterPill: {
    padding: "6px 10px", background: "#eef2ff", color: "#1d4ed8",
    borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
  },
  filterBtn: {
    width: 32, height: 32, borderRadius: 10, border: "1px solid #e5e7eb",
    background: "#fff", display: "grid", placeItems: "center", cursor: "pointer",
  },

  activeRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  pill: {
    background: "#eef2ff", color: "#1d4ed8", borderRadius: 999,
    padding: "4px 8px", fontSize: 12, fontWeight: 700,
  },

  content: { flex: 1 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: {
    position: "relative",
    display: "block", textDecoration: "none", color: "inherit",
    background: "#fff", borderRadius: 14, overflow: "hidden",
    boxShadow: "0 1px 0 rgba(0,0,0,.05)",
  },
  thumb: { height: 150, backgroundSize: "cover", backgroundPosition: "center" },
  body: { padding: 10 },
  title: { fontSize: 14, lineHeight: 1.25, minHeight: 34 },
  price: { fontWeight: 800, marginTop: 6 },
  badge: {
    position: "absolute", right: 8, top: 8, padding: "4px 8px",
    background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 8,
  },

  /* Drawer + Backdrop */
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.32)",
    zIndex: 2000, backdropFilter: "blur(1px)",
  },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: "min(360px, 92%)",
    background: "#fff", boxShadow: "-12px 0 30px rgba(0,0,0,.18)", zIndex: 2001,
    display: "flex", flexDirection: "column",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
    animation: "slideIn .22s ease",
  },
  drawerHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", borderBottom: "1px solid #e5e7eb",
  },
  icon: { width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" },
  group: { padding: "12px 14px", borderBottom: "1px solid #e5e7eb" },
  label: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  rangerow: { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" },
  input: { height: 36, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 10px", fontSize: 14, outline: "none" },
  quick: { height: 32, borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", padding: "0 10px", cursor: "pointer", fontSize: 12 },
  chkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14 },
  sortRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  sortBtn: { height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13.5 },
  sortActive: { background: "#eef2ff", borderColor: "#2563eb", boxShadow: "0 2px 8px rgba(37,99,235,.2)", color: "#1d4ed8", fontWeight: 700 },

  drawerFooter: { marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "12px 14px" },
  resetBtn: { height: 42, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer" },
  applyBtn: { height: 42, borderRadius: 12, border: "none", background: "#2563eb", color: "#fff", fontWeight: 800, cursor: "pointer" },
};

/* (tùy chọn) thêm keyframes vào global CSS để mượt hơn:
@keyframes slideIn { from { transform: translateX(20%); opacity:.8 } to { transform: translateX(0); opacity:1 } }
*/
