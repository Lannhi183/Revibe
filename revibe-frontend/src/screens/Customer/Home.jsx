import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserRoleDebug from "../../components/UserRoleDebug.jsx";
import { getAuthHeaders } from "../../utils/auth.js";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

export default function Home() {
  const nav = useNavigate();

  // ------- SEARCH STATE -------
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // highlighted index
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // ===== money helpers (USD -> VND) =====
  // prices are returned in VND from backend
  const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Math.round(n || 0));

  // Gộp data để gợi ý (có thể thay bằng API)
  const ALL_ITEMS = useMemo(() => {
    const a = [
      ...mock.justForYou,
      ...mock.newItems,
    ].map((p) => ({ type: "product", id: p.id, title: p.title, img: p.img, price: p.price }));

    const cats = mock.categories.map((c) => ({
      type: "category",
      id: c.id,
      title: c.name,
      img: c.img,
    }));

    return [...a, ...cats];
  }, []);

  // Backend-driven sections
  const [justForYou, setJustForYou] = useState(mock.justForYou);
  const [newItems, setNewItems] = useState(mock.newItems);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState(null);

  const buildHeaders = () => getAuthHeaders();

  async function fetchHomeSections() {
    setHomeLoading(true);
    setHomeError(null);
    try {
      // Fetch 'just for you' (server may implement personalization)
      const q1 = new URLSearchParams();
      q1.set("isYour", "false");
      q1.set("limit", "8");
      const r1 = await fetch(`${API_BASE}/listings?${q1.toString()}`, { headers: buildHeaders(), cache: "no-store" });
      const b1 = await r1.json().catch(() => null);
      const arr1 = Array.isArray(b1) ? b1 : b1?.data ?? [];

      // Fetch 'new items' — sorted by created_at desc
      const q2 = new URLSearchParams();
      q2.set("isYour", "false");
      q2.set("sort", "created_at_desc");
      q2.set("limit", "8");
      const r2 = await fetch(`${API_BASE}/listings?${q2.toString()}`, { headers: buildHeaders(), cache: "no-store" });
      const b2 = await r2.json().catch(() => null);
      const arr2 = Array.isArray(b2) ? b2 : b2?.data ?? [];

      const mapListing = (l) => ({ id: l._id || l.id, title: l.title, img: (l.images && l.images[0]) || "/placeholder.svg", price: l.price || 0 });

      const jfu = arr1.map(mapListing);
      const ni = arr2.map(mapListing);

      // Ensure at least 4 items: pad with mock if needed
      const pad = (arr, ref) => {
        const out = arr.slice(0, 8);
        if (out.length >= 4) return out;
        const needed = 4 - out.length;
        return [...out, ...ref.slice(0, needed)];
      };

      setJustForYou(pad(jfu, mock.justForYou));
      setNewItems(pad(ni, mock.newItems));
    } catch (err) {
      setHomeError(String(err.message || err));
      setJustForYou(mock.justForYou);
      setNewItems(mock.newItems);
    } finally {
      setHomeLoading(false);
    }
  }

  useEffect(() => { fetchHomeSections(); }, []);

  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q);
    // Ưu tiên: title bắt đầu với q -> chứa q
    const starts = [];
    const contains = [];
    for (const it of ALL_ITEMS) {
      const t = norm(it.title);
      if (t.startsWith(nq)) starts.push(it);
      else if (t.includes(nq)) contains.push(it);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [q, ALL_ITEMS]);

  // đóng dropdown khi click ra ngoài
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goSearch = (kw) => {
    const query = (kw ?? q).trim();
    if (!query) return;
    setOpen(false);
    setHi(-1);
    nav(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min((i < 0 ? -1 : i) + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, -1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && suggestions[hi]) {
        const s = suggestions[hi];
        if (s.type === "product") nav(`/search?q=${encodeURIComponent(s.title)}`);
        else nav(`/search?q=${encodeURIComponent(s.title)}&cat=${encodeURIComponent(s.title)}`);
        setOpen(false);
        setHi(-1);
      } else {
        goSearch();
      }
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div style={st.root}>
      <div style={st.wrap}>
        {/* Debug component - shows current user role */}
        {/* <UserRoleDebug /> */}
        
        {/* Header */}
        <header style={st.header}>
          <div style={st.wordmark}>
            <span style={{ fontWeight: 800 }}>Re</span>
            <span style={{ fontWeight: 500 }}>Vibe</span>
          </div>

          {/* Search box + dropdown */}
          <div ref={boxRef} style={{ position: "relative" }}>
            <div style={st.searchWrap}>
              <input
                ref={inputRef}
                placeholder="Tìm kiếm"
                value={q}
                onFocus={() => suggestions.length && setOpen(true)}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(true);
                  setHi(-1);
                }}
                onKeyDown={onKeyDown}
                style={st.searchInput}
              />
              <button
                type="button"
                aria-label="Tìm bằng hình ảnh"
                style={st.camBtn}
                onClick={() => goSearch()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h2.1a1 1 0 0 0 .9-.553L9.7 5.21A1.8 1.8 0 0 1 11.3 4h1.4a1.8 1.8 0 0 1 1.6 1.21l.7 1.237A1 1 0 0 0 15.9 7H18a3 3 0 0 1 3 3v7Z"
                    stroke="#2563eb"
                    strokeWidth="1.7"
                  />
                  <circle cx="12" cy="13.5" r="3.2" stroke="#2563eb" strokeWidth="1.7" />
                </svg>
              </button>
            </div>

            {/* Dropdown */}
            {open && suggestions.length > 0 && (
              <ul style={st.dd} role="listbox" aria-label="Gợi ý tìm kiếm">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.type}-${s.id}`}
                    role="option"
                    aria-selected={hi === i}
                    onMouseEnter={() => setHi(i)}
                    onMouseLeave={() => setHi(-1)}
                    onMouseDown={(e) => e.preventDefault()} // tránh blur input trước click
                    onClick={() => {
                      if (s.type === "product")
                        nav(`/search?q=${encodeURIComponent(s.title)}`);
                      else
                        nav(`/search?q=${encodeURIComponent(s.title)}&cat=${encodeURIComponent(s.title)}`);
                      setOpen(false);
                      setHi(-1);
                    }}
                    style={{
                      ...st.ddItem,
                      ...(hi === i ? st.ddActive : null),
                    }}
                  >
                    <img src={s.img} alt="" style={st.ddThumb} />
                    <div>
                      <div style={st.ddTitle}>{s.title}</div>
                      <div style={st.ddSub}>
                        {s.type === "product" ? "Sản phẩm" : "Danh mục"}
                        {s.price != null ? ` · ${fmtVND(s.price)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
                {/* Hành động: tìm với “q” */}
                <li
                  role="option"
                  aria-selected={hi === suggestions.length}
                  onMouseEnter={() => setHi(suggestions.length)}
                  onMouseLeave={() => setHi(-1)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goSearch()}
                  style={{
                    ...st.ddItemAction,
                    ...(hi === suggestions.length ? st.ddActive : null),
                  }}
                >
                  Tìm “{q}”
                </li>
              </ul>
            )}
          </div>
        </header>

        <main style={{ padding: "12px" }}>
          {/* Banner */}
          <section style={st.hero}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Giảm giá lớn</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                Giảm đến 70%
              </div>
              <button style={st.cta}>Mua ngay →</button>
            </div>
            <div style={st.heroImg} />
          </section>

          {/* Dành riêng cho bạn */}
          <Section title="Dành riêng cho bạn" actionTo="/for-you">
            <div style={st.row}>
              {(homeLoading ? mock.justForYou : justForYou).map((p) => (
                <ProductCard key={p.id} p={p} fmtVND={fmtVND} />
              ))}
            </div>
          </Section>

          {/* Top Seller uy tín */}
          <Section title="Top Seller uy tín" actionTo="/top-sellers">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Sắp ra mắt</div>
            </div>
            <ul style={st.sellersRow}>
              {mock.topSellers.map((s) => (
                <li key={s.id} style={st.sellerItem}>
                  <Link to={`/seller/${s.id}`} style={st.sellerLink} title={s.name}>
                    <img src={s.avatar} alt={s.name} style={st.sellerImg} />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          {/* Hàng mới */}
          <Section title="Hàng mới" actionTo="/new-items">
            <Grid cols={2}>
              {(homeLoading ? mock.newItems.slice(0, 4) : newItems.slice(0, 4)).map((p) => (
                <ProductTall key={p.id} p={p} fmtVND={fmtVND} />
              ))}
            </Grid>
          </Section>

          {/* Danh mục */}
          <Section title="Danh mục" actionTo="/categories">
            <Grid cols={3}>
              {mock.categories.map((c) => (
                <CategoryCard key={c.id} c={c} />
              ))}
            </Grid>
          </Section>

          {/* chừa chỗ cho BottomTab */}
          <div style={{ height: "calc(92px + env(safe-area-inset-bottom))" }} />
        </main>
      </div>
    </div>
  );
}

/* Reusable */
function Section({ title, action = "Xem tất cả", actionTo = "", children }) {
  return (
    <section style={{ marginTop: 14 }}>
      <div style={st.secHead}>
        <h3 style={st.secTitle}>{title}</h3>
        {actionTo && (
          <Link to={actionTo} style={st.secAction}>
            {action}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Grid({ cols, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>
      {children}
    </div>
  );
}

function ProductCard({ p, fmtVND }) {
  return (
    <Link to={`/product/${p.id}`} style={st.card}>
      <div style={{ ...st.cardImg, backgroundImage: `url(${p.img})` }} />
      <div style={st.cardBody}>
        <div style={st.cardTitle}>{p.title}</div>
  <div style={st.cardPrice}>{fmtVND(p.price)}</div>
      </div>
    </Link>
  );
}
function ProductTall({ p, fmtVND }) {
  return (
    <Link to={`/product/${p.id}`} style={st.tall}>
      <div style={{ ...st.tallImg, backgroundImage: `url(${p.img})` }} />
      <div style={st.tallBody}>
        <div style={st.tallTitle}>{p.title}</div>
  <div style={{ marginTop: 6, fontWeight: 800 }}>{fmtVND(p.price)}</div>
      </div>
    </Link>
  );
}
function CategoryCard({ c }) {
  return (
    <Link to={`/catalog?cat=${encodeURIComponent(c.name)}`} style={st.cat}>
      <div style={{ ...st.catImg, backgroundImage: `url(${c.img})` }} />
      <div style={st.catName}>{c.name}</div>
    </Link>
  );
}

/* Styles */
const st = {
  root: { overflowX: "hidden", background: "#f8fafc", minHeight: "100vh" },
  wrap: { width: "min(430px, 100%)", margin: "0 auto" },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    background: "#fff",
  },
  wordmark: { fontSize: 22, letterSpacing: 0.2 },

  searchWrap: {
    position: "relative",
    height: 36,
    background: "#f6f7f9",
    borderRadius: 999,
    display: "grid",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 44,
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    color: "#0f172a",
  },
  camBtn: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 28,
    borderRadius: 8,
    background: "#fff",
    border: "1.6px solid #2563eb",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },

  // Dropdown
  dd: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 40,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 12px 30px rgba(2,6,23,.14)",
    padding: 6,
    listStyle: "none",
    margin: 0,
    zIndex: 20,
    maxHeight: 340,
    overflowY: "auto",
  },
  ddItem: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 10,
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
  },
  ddItemAction: {
    padding: "10px 12px",
    borderTop: "1px solid #eef2ff",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#2563eb",
    background: "#f8fafc",
    marginTop: 4,
  },
  ddActive: { background: "#eef2ff" },
  ddThumb: { width: 40, height: 40, objectFit: "cover", borderRadius: 10 },
  ddTitle: { fontSize: 14, color: "#0f172a" },
  ddSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  hero: {
    display: "grid",
    gridTemplateColumns: "1.2fr .8fr",
    gap: 12,
    background: "#e9efff",
    borderRadius: 16,
    padding: 14,
  },
  cta: {
    marginTop: 8,
    padding: "8px 12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  heroImg: {
    background: "url('/images/product3.jpg') center/cover",
    borderRadius: 12,
  },

  secHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "10px 0 8px",
  },
  secTitle: { margin: 0, fontSize: 16 },
  secAction: { color: "#2563eb", textDecoration: "none", fontSize: 14 },

  row: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "62%",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 4,
  },

  card: {
    display: "block",
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 0 rgba(0,0,0,.05)",
  },
  cardImg: { height: 160, backgroundSize: "cover", backgroundPosition: "center" },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 14, lineHeight: 1.25 },
  cardPrice: { marginTop: 6, fontWeight: 700 },

  tall: {
    display: "block",
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
  },
  tallImg: { height: 150, backgroundSize: "cover", backgroundPosition: "center" },
  tallBody: { padding: 10 },
  tallTitle: { fontSize: 14, lineHeight: 1.25, minHeight: 34 },

  cat: { display: "block", textDecoration: "none", color: "inherit", textAlign: "center" },
  catImg: { height: 84, borderRadius: 12, backgroundSize: "cover", backgroundPosition: "center" },
  catName: { fontSize: 12, marginTop: 6 },

  // Top sellers tròn tuyệt đối
  sellersRow: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    padding: "2px 2px 6px",
    listStyle: "none",
    margin: 0,
  },
  sellerItem: { flex: "0 0 auto" },
  sellerLink: {
    display: "grid",
    placeItems: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 0 rgba(0,0,0,.06), 0 0 0 2px #e5e7eb",
    textDecoration: "none",
  },
  sellerImg: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    boxShadow: "0 0 0 2px #fff",
  },
};

/* mock (dùng ảnh local trong /public/images) */
const local = (name) => `/images/${name}.jpg`;
const mock = {
  justForYou: [
    { id: "j1", title: "Áo thun basic",  price: 7.5,  img: local("product5") },
    { id: "j2", title: "Áo khoác denim", price: 26.9, img: local("product7") },
    { id: "j3", title: "Đầm mùa hè",     price: 19.9, img: local("product3") },
  ],
  topSellers: [
    { id: "s1", name: "Lena", avatar: local("seller1") },
    { id: "s2", name: "Jax",  avatar: local("seller2") },
    { id: "s3", name: "Mira", avatar: local("seller3") },
    { id: "s4", name: "Noah", avatar: local("seller4") },
    { id: "s5", name: "Ivy",  avatar: local("seller5") },
  ],
  newItems: [
    { id: "n1", title: "Giày chạy bộ",    price: 29.0, img: local("product2") },
    { id: "n2", title: "Sneakers casual", price: 24.0, img: local("product4") },
    { id: "n3", title: "Giày thể thao",   price: 22.0, img: local("product6") },
    { id: "n4", title: "Urban sneaks",    price: 28.0, img: local("product1") },
  ],
  categories: [
    { id: "c1", name: "Quần áo",   img: local("product3") },
    { id: "c2", name: "Giày dép",  img: local("product2") },
    { id: "c3", name: "Túi xách",  img: local("product6") },
    { id: "c4", name: "Đồng hồ",   img: local("product4") },
    { id: "c5", name: "Hoodie",    img: local("product5") },
    { id: "c6", name: "Phụ kiện",  img: local("product7") },
  ],
};
