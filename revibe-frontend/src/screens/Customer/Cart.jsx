// src/screens/Customer/Cart.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders, isAuthenticated } from "../../utils/auth.js";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

/* ================= public image helpers ================= */
const publicBase =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : (process.env.PUBLIC_URL || "/");
const withBase = (p) => `${publicBase.replace(/\/$/, "")}${p}`;

/* ================= helpers & constants ================= */
const CART_KEY = "revibe.cart";
const CHECKOUT_INTENT_KEY = "revibe.checkout.intent";
const BOTTOM_TAB_H = 72;

// address keys (khớp Address.jsx)
const LS_ADDR = "revibe.addresses";
const LS_DEFAULT = "revibe.address.defaultId";

/** Tiền Việt: 1 đơn vị giá demo = 1.000₫ (có thể đổi tuỳ nhu cầu) */
// Prices from backend are already in VND. Format numbers directly.
const fmtVND = (n) => `${Math.round(Number(n || 0)).toLocaleString("vi-VN")} ₫`;

const getCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch { return []; }
};
const setCart = (arr) => {
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("revibe:cartUpdated", {
    detail: { count: arr.reduce((s, i) => s + i.qty, 0), items: arr }
  }));
};

const loadJson = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; }
  catch { return fb; }
};

/* ============== Fixed-size thumbnail (no layout shift) ============== */
function ThumbBox({ src, alt }) {
  return (
    <div
      aria-label={alt}
      style={{
        ...thumb,
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

/* ================= component ================= */
export default function Cart() {
  const nav = useNavigate();

  // cart
  const [items, setItems] = useState(() =>
    getCart().map((x) => ({ ...x, selected: true }))
  );

  // auth helpers
  const buildHeaders = () => getAuthHeaders();

  // fetch cart from server
  const fetchServerCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/cart/my-cart`, {
        headers: buildHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) {
        // not authenticated -> keep local cart
        return;
      }
      if (!res.ok) {
        return;
      }
      const body = await res.json().catch(() => null);
      const cart = (body && (body.data ?? body)) || null;
      if (!cart) return;
      const srvItems = (cart.items || []).map((it) => ({
        id: it.listing_id,
        title: it.title,
        image: it.image || null,
        qty: it.qty,
        price: it.price,
        sellerId: it.seller_id,
        selected: true,
      }));
      setItems(srvItems);
      // update local cache to keep UI consistent when offline
      setCart(srvItems);
    } catch {
      // ignore network error -> keep local
    }
  };

  // call server update qty
  const updateServerQty = async (idx, qty) => {
    try {
      const res = await fetch(`${API_BASE}/cart/update`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ idx, qty }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchServerCart();
    } catch {
      // fallback to local update
      persist(items.map((it, i) => (i === idx ? { ...it, qty } : it)));
    }
  };

  // call server remove
  const removeServerItem = async (idx) => {
    try {
      const res = await fetch(`${API_BASE}/cart/remove`, {
        method: "DELETE",
        headers: buildHeaders(),
        body: JSON.stringify({ idx }),
      });
      if (!res.ok) throw new Error("Remove failed");
      await fetchServerCart();
    } catch {
      persist(items.filter((_, i) => i !== idx));
    }
  };

  // addresses (đọc từ Address.jsx)
  const [addresses, setAddresses] = useState(() => loadJson(LS_ADDR, []));
  const [defaultAddrId, setDefaultAddrId] = useState(() => loadJson(LS_DEFAULT, null));

  const selectedAddr = useMemo(
    () => addresses.find(a => a.id === defaultAddrId) || null,
    [addresses, defaultAddrId]
  );

  // sync cart từ nơi khác (ProductDetail...)
  // sync cart from other sources (listen events)
  useEffect(() => {
    const onUpd = (e) => {
      const fromLs = e?.detail?.items || getCart();
      setItems((prev) => {
        const findSel = (v) =>
          prev.find((p) => p.id === v.id && p.color === v.color && p.size === v.size)?.selected ?? true;
        return fromLs.map((v) => ({ ...v, selected: findSel(v) }));
      });
    };
    window.addEventListener("revibe:cartUpdated", onUpd);

    // If authenticated prefer server cart on mount
    fetchServerCart();

    onUpd(); // first render from local
    return () => window.removeEventListener("revibe:cartUpdated", onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync address khi quay về từ Address, đổi tab, hoặc storage thay đổi
  useEffect(() => {
    const syncAddr = () => {
      setAddresses(loadJson(LS_ADDR, []));
      setDefaultAddrId(loadJson(LS_DEFAULT, null));
    };
    window.addEventListener("focus", syncAddr);
    const onVis = () => { if (document.visibilityState === "visible") syncAddr(); };
    document.addEventListener("visibilitychange", onVis);
    const onStorage = (e) => {
      if (e.key === LS_ADDR || e.key === LS_DEFAULT) syncAddr();
    };
    window.addEventListener("storage", onStorage);
    // sync lần đầu
    syncAddr();
    return () => {
      window.removeEventListener("focus", syncAddr);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const total = useMemo(
    () => items.filter((i) => i.selected).reduce((s, i) => s + i.price * i.qty, 0),
    [items]
  );

  const persist = (draft) => {
    setItems(draft);
    const toSave = draft.map(({ selected, ...rest }) => rest);
    setCart(toSave);
  };

  const isAuthed = () => isAuthenticated();

  // actions
  const toggle = (i) => persist(items.map((it, idx) => (idx === i ? { ...it, selected: !it.selected } : it)));
  const inc = (i) => {
    const newQty = items[i].qty + 1;
    if (isAuthed()) return updateServerQty(i, newQty);
    return persist(items.map((it, idx) => (idx === i ? { ...it, qty: newQty } : it)));
  };
  const dec = (i) => {
    const newQty = Math.max(1, items[i].qty - 1);
    if (isAuthed()) return updateServerQty(i, newQty);
    return persist(items.map((it, idx) => (idx === i ? { ...it, qty: newQty } : it)));
  };
  const remove = (i) => {
    if (isAuthed()) return removeServerItem(i);
    return persist(items.filter((_, idx) => idx !== i));
  };

  const checkout = () => {
    const picked = items.filter((x) => x.selected);
    if (!picked.length) return alert("Vui lòng chọn ít nhất 1 sản phẩm.");
    const intent = {
      from: "cart",
      createdAt: Date.now(),
      items: picked,
      total: picked.reduce((s, i) => s + i.price * i.qty, 0),
    };
    localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
    nav("/checkout");
  };

  /* =============== Empty State =============== */
  if (items.length === 0) {
    return (
      <div style={page}>
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={title}>Giỏ hàng</h2>
            <span style={badge}>0</span>
          </div>
        </div>

        <div style={emptyWrap}>
          <div style={emptyCircle}>
            <img
              src={withBase("/images/revibe-logo.png")}
              alt="REVIBE logo"
              style={{ width: 92, height: 92, objectFit: "contain" }}
              draggable={false}
            />
          </div>
          <div style={emptyTitle}>Giỏ hàng trống</div>
          <div style={emptyHint}>Bắt đầu mua sắm để thêm sản phẩm vào giỏ nhé.</div>
          <button style={emptyBtn} onClick={() => nav("/home")}>Tiếp tục mua sắm</button>
        </div>
      </div>
    );
  }

  /* =============== Normal State =============== */
  return (
    <div style={page}>
      {/* Header */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={title}>Giỏ hàng</h2>
          <span style={badge}>{items.length}</span>
        </div>
      </div>

      {/* Địa chỉ giao hàng — map với địa chỉ đang chọn từ Address.jsx */}
      <button onClick={() => nav("/address")} style={addrCard} aria-label="Đi tới màn hình địa chỉ">
        <div style={addrHead}>
          <span style={{ fontWeight: 800, color: "#111827" }}>Địa chỉ giao hàng</span>
          <span style={editChip}>✎</span>
        </div>

        {selectedAddr ? (
          <>
            <div style={addrLineTop}>
              <b style={{ fontSize: 14.5, color: "#0f172a" }}>{selectedAddr.receiver || "—"}</b>
              {selectedAddr.phone && <span style={addrPhone}>{selectedAddr.phone}</span>}
            </div>
            <p style={addrText}>
              {[
                selectedAddr.houseNo && `Số ${selectedAddr.houseNo}`,
                selectedAddr.street,
                selectedAddr.ward,
                selectedAddr.district,
                selectedAddr.city,
              ].filter(Boolean).join(", ")}
            </p>
          </>
        ) : (
          <p style={{ ...addrText, color: "#6b7280" }}>
            Chưa có địa chỉ. Nhấn để thêm địa chỉ giao hàng.
          </p>
        )}
      </button>

      {/* Danh sách sản phẩm */}
      <div style={{ display: "grid", gap: 18, paddingBottom: 140 + BOTTOM_TAB_H }}>
        {items.map((it, i) => (
          <article key={`${it.id}-${it.color}-${it.size}`} style={row}>
            {/* checkbox */}
            <div style={checkWrap}>
              <button
                onClick={() => toggle(i)}
                aria-label="Chọn sản phẩm"
                style={{ ...checkBase, ...(it.selected ? checkOn : checkOff) }}
              >
                {it.selected && <CheckSVG />}
              </button>
            </div>

            {/* ảnh + xoá */}
            <div style={thumbWrap}>
              <Link to={`/product/${it.id}`} style={{ display: "block" }}>
                <ThumbBox src={it.image} alt={it.title} />
              </Link>
              <button onClick={() => remove(i)} style={trashFab} aria-label="Xoá sản phẩm">
                <TrashIcon />
              </button>
            </div>

            {/* thông tin */}
            <div style={infoCol}>
              <Link to={`/product/${it.id}`} style={linkReset}>
                <div style={prodTitle} title={it.title}>{it.title}</div>
              </Link>
              <div style={attrText}>{[it.color, it.size].filter(Boolean).join(", ")}</div>
              <div style={price}>{fmtVND(it.price)}</div>
            </div>

            {/* số lượng (− 1 +) */}
            <div style={qtyRow}>
              <button onClick={() => dec(i)} style={stepCircle} aria-label="Giảm số lượng">−</button>
              <div style={qtyPill}>{it.qty}</div>
              <button onClick={() => inc(i)} style={stepCircle} aria-label="Tăng số lượng">+</button>
            </div>
          </article>
        ))}
      </div>

      {/* Tổng tiền + Thanh toán */}
      <footer
        style={{
          ...footerBar,
          bottom: `calc(${BOTTOM_TAB_H}px + 10px + env(safe-area-inset-bottom))`,
        }}
      >
        <div style={totalText}>
          <span style={{ opacity: .75, marginRight: 6 }}>Tổng</span>{fmtVND(total)}
        </div>
        <button style={checkoutBtn} onClick={checkout}>Thanh toán</button>
      </footer>
    </div>
  );
}

/* ================= icons ================= */
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="white" strokeWidth="2"/>
      <path d="M6 6l1.2 14a2 2 0 0 0 2 2h5.6a2 2 0 0 0 2-2L18 6" stroke="white" strokeWidth="2"/>
      <path d="M10 11v6M14 11v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function CheckSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ================= styles ================= */
const page = {
  maxWidth: 430,
  margin: "0 auto",
  padding: "12px 14px",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#0f172a",
};

const header = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const title = { fontSize: 28, margin: 0, fontWeight: 900 };
const badge = {
  minWidth: 24,
  height: 24,
  padding: "0 8px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 700,
};

const addrCard = {
  width: "100%",
  textAlign: "left",
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 4px 24px rgba(0,0,0,.08)",
  border: "1px solid #f1f5f9",
  marginTop: 6,
  cursor: "pointer",
};
const addrHead = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 };

const addrLineTop = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 4,
};
const addrPhone = {
  padding: "2px 8px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
};

const addrText = { margin: 0, color: "#374151", fontSize: 13, lineHeight: 1.4 };
const editChip = {
  width: 36, height: 36, borderRadius: 20,
  display: "grid", placeItems: "center",
  background: "#2563eb", color: "#fff",
  boxShadow: "0 8px 18px rgba(37,99,235,.35)",
};

const row = {
  display: "grid",
  gridTemplateColumns: "28px 92px 1fr auto",
  gap: 12,
  alignItems: "center",
};

/* wrapper căn giữa checkbox */
const checkWrap = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
};

/* nút checkbox */
const checkBase = {
  width: 22,
  height: 22,
  boxSizing: "border-box",
  padding: 0,
  lineHeight: 0,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  transition: "all .15s ease",
  outline: "none",
};
const checkOn = {
  background: "#2563eb",
  border: "2px solid #2563eb",
  boxShadow: "0 2px 10px rgba(37,99,235,.25)",
};
const checkOff = {
  background: "#fff",
  border: "2px solid #2563eb",
  color: "#2563eb",
  boxShadow: "0 2px 8px rgba(37,99,235,.12)",
};

const thumbWrap = { position: "relative" };
const thumb = {
  width: 92, height: 72, objectFit: "cover",
  borderRadius: 12, background: "#f3f4f6",
  boxShadow: "0 8px 20px rgba(0,0,0,.10)",
};
const trashFab = {
  position: "absolute",
  left: -10, bottom: -10,
  width: 34, height: 34, borderRadius: 18,
  border: "none", background: "#ef4444", color: "#fff",
  display: "grid", placeItems: "center",
  boxShadow: "0 8px 18px rgba(239,68,68,.45)",
  cursor: "pointer",
};

const infoCol = { minWidth: 0 };
const linkReset = { color: "inherit", textDecoration: "none" };
const prodTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const attrText = { marginTop: 4, fontSize: 13, color: "#6b7280" };
const price = { marginTop: 8, fontSize: 18, fontWeight: 900 };

const qtyRow = { display: "grid", gridAutoFlow: "column", gap: 8, alignItems: "center" };
const stepCircle = {
  width: 36, height: 36, borderRadius: "50%",
  border: "2px solid #2563eb", background: "#fff", color: "#2563eb",
  fontSize: 18, fontWeight: 800, lineHeight: 1, cursor: "pointer",
  display: "grid", placeItems: "center",
  boxShadow: "0 2px 10px rgba(37,99,235,.15)",
};
const qtyPill = {
  minWidth: 42, height: 36, borderRadius: 10,
  border: "1px solid #e5e7eb", background: "#eef2ff",
  display: "grid", placeItems: "center",
  fontSize: 14, fontWeight: 800, color: "#0f172a",
};

const footerBar = {
  position: "fixed",
  left: "50%", transform: "translateX(-50%)",
  width: "min(430px, 92%)",
  background: "#f3f4f6",
  borderRadius: 16,
  padding: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 10px 28px rgba(0,0,0,.18)",
  zIndex: 60,
};
const totalText = { fontSize: 18, fontWeight: 900 };
const checkoutBtn = {
  height: 46, padding: "0 22px",
  borderRadius: 12, border: "none",
  background: "#2563eb", color: "#fff",
  fontWeight: 800, fontSize: 16, cursor: "pointer",
  boxShadow: "0 12px 22px rgba(37,99,235,.35)",
};

/* ===== Empty state styles ===== */
const emptyWrap = {
  minHeight: "60vh",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 14,
  textAlign: "center",
};
const emptyCircle = {
  width: 120, height: 120, borderRadius: "50%",
  background: "#fff", display: "grid", placeItems: "center",
  boxShadow: "0 16px 40px rgba(0,0,0,.15), inset 0 0 0 1px #eef2ff",
};
const emptyTitle = { fontSize: 18, fontWeight: 800, color: "#0f172a" };
const emptyHint  = { fontSize: 13.5, color: "#6b7280" };
const emptyBtn = {
  marginTop: 6,
  height: 44, padding: "0 18px",
  borderRadius: 12, border: "none",
  background: "#2563eb", color: "#fff",
  fontWeight: 800, cursor: "pointer",
  boxShadow: "0 10px 22px rgba(37,99,235,.25)",
};
