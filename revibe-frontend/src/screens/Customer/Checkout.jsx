import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders, getAccessToken, isAuthenticated } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

/* ============ KEYS & HELPERS (khớp với Cart/Address) ============ */
const CHECKOUT_INTENT_KEY = "revibe.checkout.intent";
const CART_KEY = "revibe.cart";
const LS_ADDR = "revibe.addresses";
const LS_DEFAULT = "revibe.address.defaultId";
const BOTTOM_TAB_H = 72;

const APP_FEE_RATE = 0.10;       // 10% phí app
const EXPRESS_SHIP_FEE = 30000;  // 30.000 ₫ cho giao nhanh

/** Nếu giá sản phẩm đang lưu là USD, bật true để tự quy đổi sang VND */
const USE_EXCHANGE_RATE = false;
const USD_TO_VND = 25000;

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Math.round(n));

const loadJson = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? fb;
  } catch {
    return fb;
  }
};

/* ============ COMPONENT ============ */
export default function Checkout() {
  const nav = useNavigate();

  // 1) lấy intent từ Cart (khi ấn “Thanh toán”), hoặc fallback cart
  const [intent, setIntent] = useState(() => loadJson(CHECKOUT_INTENT_KEY, null));
  const [items, setItems] = useState(() => {
    if (intent?.items?.length) return intent.items;
    const cart = loadJson(CART_KEY, []);
    return cart;
  });

  // 2) địa chỉ mặc định từ Address.jsx
  const [addresses, setAddresses] = useState(() => loadJson(LS_ADDR, []));
  const [defaultAddrId, setDefaultAddrId] = useState(() => loadJson(LS_DEFAULT, null));
  const selectedAddr = useMemo(
    () => addresses.find((a) => a.id === defaultAddrId) || null,
    [addresses, defaultAddrId]
  );

  // network / auth helpers
  const buildHeaders = () => {
    return getAuthHeaders();
  };

  const parseJwt = (token) => {
    try {
      const p = token.split(".")[1];
      const decoded = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };
  // fetch addresses from server if authenticated
  const fetchAddresses = async () => {
    if (!isAuthenticated()) return; // keep local fallback
    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        headers: buildHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      const list = Array.isArray(body) ? body : body.data ?? [];
      if (list && list.length) {
        const mapped = list.map((a) => ({ id: a._id || a.id, ...a }));
        setAddresses(mapped);
        const def = mapped.find((x) => x.is_default) || mapped[0];
        if (def) {
          setDefaultAddrId(def.id);
          localStorage.setItem(LS_ADDR, JSON.stringify(mapped));
          localStorage.setItem(LS_DEFAULT, JSON.stringify(def.id));
        }
      }
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    // prefer server addresses when auth exists
    fetchAddresses();
    // also keep other sync listeners from existing code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // đồng bộ khi quay lại từ /address
  useEffect(() => {
    const sync = () => {
      setIntent(loadJson(CHECKOUT_INTENT_KEY, null));
      setItems(() => {
        const it = loadJson(CHECKOUT_INTENT_KEY, null)?.items;
        return it?.length ? it : loadJson(CART_KEY, []);
      });
      setAddresses(loadJson(LS_ADDR, []));
      setDefaultAddrId(loadJson(LS_DEFAULT, null));
    };
    const onVisible = () => document.visibilityState === "visible" && sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    sync();
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 3) vận chuyển + thanh toán
  const [ship, setShip] = useState("standard"); // "standard" | "express"
  const [pay, setPay] = useState("vietqr");     // "vietqr" | "cod"

  // Chuẩn hoá giá tiền từng item sang VND nếu cần
  const itemsInVND = useMemo(() => {
    return (items || []).map((i) => {
      const base = Number(i.price) || 0;
      return {
        ...i,
        priceVND: USE_EXCHANGE_RATE ? base * USD_TO_VND : base,
      };
    });
  }, [items]);

  const itemsTotal = useMemo(
    () => (itemsInVND || []).reduce((s, i) => s + i.priceVND * i.qty, 0),
    [itemsInVND]
  );

  const shippingCost = ship === "standard" ? 0 : EXPRESS_SHIP_FEE;
  const appFee = useMemo(() => Math.round(itemsTotal * APP_FEE_RATE), [itemsTotal]);
  const grandTotal = itemsTotal + appFee + shippingCost;

  // 4) Sang màn Payment.jsx
  const goPayment = async () => {
    if (!items?.length) return;
    if (!selectedAddr) {
      alert("Vui lòng chọn địa chỉ giao hàng.");
      return;
    }

    // normalize address fields (try several common keys)
    const full_name =
      selectedAddr.receiver ||
      selectedAddr.full_name ||
      selectedAddr.name ||
      selectedAddr.label ||
      "Khách hàng";
    const phone =
      selectedAddr.phone ||
      selectedAddr.phone_number ||
      selectedAddr.mobile ||
      selectedAddr.tel ||
      "";
    const city =
      selectedAddr.city || selectedAddr.province || selectedAddr.region || "";
    const line1 =
      (selectedAddr.line1 &&
        String(selectedAddr.line1).trim()) ||
      [selectedAddr.houseNo, selectedAddr.street, selectedAddr.address, selectedAddr.line].filter(Boolean).join(" ").trim() ||
      "";

      const itemIds = (items || [])
      .map((it) => String(it.id || it.listing_id || it._id || ""))
      .filter(Boolean);

    // If not authenticated -> behave like local flow (existing)
    if (!isAuthenticated()) {
      const draft = {
        items: itemsInVND.map(({ priceVND, ...rest }) => ({ ...rest, priceVND })),
        address: selectedAddr,
        shipping: { type: ship, fee: shippingCost },
        totals: {
          itemsTotal,
          appFee,
          shipping: shippingCost,
          grandTotal,
        },
        payment: { method: pay }, // vietqr | cod
        currency: "VND",
      };
      localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(draft));
      nav("/payment");
      return;
    }

    // Authenticated flow: call backend checkout -> create payment -> navigate to payment page with server data
    try {
      const token = getAccessToken();
      const payload = parseJwt(token);
      const buyerId = payload?.sub;
      if (!buyerId) throw new Error("Invalid user token");

      const addressPayload = { full_name, city };
      if (phone) addressPayload.phone = phone;
      if (line1) addressPayload.line1 = line1;

      const checkoutBody = {
        payment_method: pay === "vietqr" ? "online" : "cod",
        address: addressPayload,
      };
      if (itemIds.length) checkoutBody.items = itemIds;
      if (ship === "express") checkoutBody.isQuick = true;

      // create order
      const res = await fetch(`${API_BASE}/orders/checkout/${buyerId}`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(checkoutBody),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error((b && b.error) || `Checkout failed (${res.status})`);
      }

      const out = await res.json();
      const order = (out && (out.data?.order ?? out.data ?? out.order ?? out)) || out;
      const orderId = order._id || order.id || order.order_id;

      var payment =  null;
        try {
          const pres = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
            method: "POST",
            headers: buildHeaders(),
          });
          if (pres.ok) {
            const pbody = await pres.json().catch(() => null);
            payment = (pbody && (pbody.data ?? pbody)) || null;
          } else {
            // non-fatal: keep payment null and proceed to payment screen (UI can handle missing payment)
            console.warn("Payment initiation responded non-OK", pres.status);
          }
        } catch (e) {
          console.warn("Payment initiation failed:", e?.message || e);
        }

      // store server-driven checkout intent and go to payment screen
      const serverIntent = {
        order,
        payment,
      };
      localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(serverIntent));
      nav("/payment");
    } catch (err) {
      alert(String(err.message || err));
    }
  };

  return (
    <div style={page}>
      <header style={header}>
        <button onClick={() => nav(-1)} style={iconBtn} aria-label="Quay lại">←</button>
        <b>Thanh toán</b>
        <div />
      </header>

      {/* Địa chỉ giao hàng */}
      <button onClick={() => nav("/address")} style={addrCard} aria-label="Chỉnh sửa địa chỉ">
        <div style={addrHead}>
          <span style={{ fontWeight: 800, color: "#111827" }}>Địa chỉ giao hàng</span>
          <span style={editChip}>✎</span>
        </div>
        {selectedAddr ? (
          <>
            <div style={addrLineTop}>
              <b style={{ fontSize: 14.5, color: "#0f172a" }}>{selectedAddr.receiver}</b>
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
          <p style={{ ...addrText, color: "#6b7280" }}>Chưa có địa chỉ. Nhấn để thêm địa chỉ giao hàng.</p>
        )}
      </button>

      {/* Items */}
      <section style={{ marginTop: 14 }}>
        <div style={sectionHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b>Danh sách hàng</b>
            <span style={badge}>{items?.length || 0}</span>
          </div>
          <button style={linkBtn} onClick={() => alert("Voucher: tính năng demo")}>
            Thêm mã giảm giá
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {itemsInVND?.map((it) => (
            <div key={`${it.id}-${it.color}-${it.size}`} style={itemRow}>
              <div style={itemThumbWrap}>
                {it.qty > 1 && <span style={qtyBubble}>{it.qty}</span>}
                <img alt={it.title} src={it.image} style={itemThumb} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Link to={`/product/${it.id}`} style={linkReset}>
                  <div style={itemTitle}>{it.title}</div>
                </Link>
                <div style={itemMeta}>{[it.color, it.size].filter(Boolean).join(", ")}</div>
              </div>
              <div style={itemPrice}>{fmtVND(it.priceVND)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping */}
      <section style={{ marginTop: 18 }}>
        <b style={{ display: "block", marginBottom: 10 }}>Tuỳ chọn vận chuyển</b>

        <button
          style={{ ...shipRow, ...(ship === "standard" ? shipOn : {}) }}
          onClick={() => setShip("standard")}
          aria-label="Chọn vận chuyển tiêu chuẩn"
        >
          <span style={radioWrap}><Radio checked={ship === "standard"} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={shipPrimary}>
              <span>Tiêu chuẩn</span>
              <span style={pillMuted}>5–7 ngày</span>
              <span style={pillFree}>Miễn phí</span>
            </div>
            <div style={shipSub}>Giao trước hoặc trong thứ Năm tuần này</div>
          </div>
        </button>

        <button
          style={{ ...shipRow, marginTop: 8, ...(ship === "express" ? shipOn : {}) }}
          onClick={() => setShip("express")}
          aria-label="Chọn vận chuyển nhanh"
        >
          <span style={radioWrap}><Radio checked={ship === "express"} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={shipPrimary}>
              <span>Nhanh</span>
              <span style={pillMuted}>1–2 ngày</span>
              <span style={pillPrice}>{fmtVND(EXPRESS_SHIP_FEE)}</span>
            </div>
            <div style={shipSub}>Giao siêu tốc trong 1–2 ngày làm việc</div>
          </div>
        </button>
      </section>

      {/* Payment (VietQR | COD) */}
      <section style={{ marginTop: 18 }}>
        <div style={sectionHead}>
          <b>Phương thức thanh toán</b>
        </div>
        <div style={payRow}>
          <button
            onClick={() => setPay("vietqr")}
            style={{ ...payChip, ...(pay === "vietqr" ? payOn : {}) }}
            aria-label="Chọn VietQR"
          >
            VietQR
          </button>
          <button
            onClick={() => setPay("cod")}
            style={{ ...payChip, ...(pay === "cod" ? payOn : {}) }}
            aria-label="Chọn COD"
          >
            Thanh toán khi nhận hàng
          </button>
        </div>
      </section>

      {/* ===== Tổng kết (có Phí app 10%) ===== */}
      <section style={{ marginTop: 18 }}>
        <b style={{ display: "block", marginBottom: 8 }}>Tổng kết</b>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
          <SumRow label="Tạm tính" value={fmtVND(itemsTotal)} />
          <SumRow label="Phí app (10%)" value={fmtVND(appFee)} />
          <SumRow label="Vận chuyển" value={fmtVND(shippingCost)} />
          <div style={{ height: 1, background: "#eef2ff", margin: "8px 0" }} />
          <SumRow bold label="Tổng cộng" value={fmtVND(grandTotal)} />
        </div>
      </section>

      <div style={{ height: 90 }} />

      {/* Footer tổng tiền + sang Payment */}
      <footer
        style={{
          ...footerBar,
          bottom: `calc(${BOTTOM_TAB_H}px + 10px + env(safe-area-inset-bottom))`,
        }}
      >
        <div style={totalText}>
          <span style={{ opacity: .75, marginRight: 6 }}>Tổng</span>{fmtVND(grandTotal)}
        </div>
        <button style={orderBtn} onClick={goPayment}>
          Thanh toán
        </button>
      </footer>
    </div>
  );
}

/* ============ Sub components ============ */
function Radio({ checked }) {
  return (
    <span style={{ ...radioBase, ...(checked ? radioOn : radioOff) }}>
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

function SumRow({ label, value, bold }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "6px 0" }}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? 16 : 14, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

/* ============ Styles ============ */
const page = {
  maxWidth: 430,
  margin: "0 auto",
  padding: "12px 14px",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#0f172a",
};

const header = {
  display: "grid",
  gridTemplateColumns: "28px 1fr 28px",
  alignItems: "center",
  marginBottom: 6,
};
const iconBtn = {
  width: 28, height: 28, borderRadius: 8,
  border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer",
};

/* Address */
const addrCard = {
  width: "100%",
  textAlign: "left",
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 4px 24px rgba(0,0,0,.08)",
  border: "1px solid #f1f5f9",
  cursor: "pointer",
};
const addrHead = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 };
const addrLineTop = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 };
const addrPhone = { padding: "2px 8px", borderRadius: 999, background: "#eef2ff", color: "#1d4ed8", fontWeight: 700, fontSize: 12 };
const addrText = { margin: 0, color: "#374151", fontSize: 13, lineHeight: 1.4 };
const editChip = { width: 36, height: 36, borderRadius: 20, display: "grid", placeItems: "center", background: "#2563eb", color: "#fff", boxShadow: "0 8px 18px rgba(37,99,235,.35)" };

/* Items */
const sectionHead = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 };
const badge = { minWidth: 22, height: 22, borderRadius: 11, background: "#111827", color: "#fff", display: "grid", placeItems: "center", padding: "0 8px", fontSize: 12, fontWeight: 800 };
const linkBtn = { border: "1px solid #bfdbfe", color: "#1d4ed8", background: "#eef2ff", padding: "6px 10px", borderRadius: 999, fontWeight: 700, cursor: "pointer" };

const itemRow = { display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" };
const itemThumbWrap = { position: "relative" };
const qtyBubble = { position: "absolute", left: -6, top: -6, width: 22, height: 22, borderRadius: 11, background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, boxShadow: "0 6px 16px rgba(37,99,235,.35)" };
const itemThumb = { width: 54, height: 54, borderRadius: "50%", objectFit: "cover", background: "#f3f4f6", boxShadow: "0 8px 18px rgba(0,0,0,.08)" };
const linkReset = { color: "inherit", textDecoration: "none" };
const itemTitle = { fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const itemMeta = { fontSize: 12.5, color: "#6b7280", marginTop: 2 };
const itemPrice = { fontWeight: 900 };

/* Shipping */
const shipRow = { display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" };
const shipOn = { borderColor: "#2563eb", boxShadow: "0 4px 14px rgba(37,99,235,.15)" };
const radioWrap = { display: "grid", placeItems: "center" };
const shipPrimary = { display: "flex", gap: 8, alignItems: "center", fontWeight: 700 };
const pillMuted = { background: "#eef2ff", color: "#1d4ed8", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 };
const pillFree = { background: "#e6ffed", color: "#15803d", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 800 };
const pillPrice = { background: "#fff7ed", color: "#b45309", border: "1px solid #fed7aa", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 800 };
const shipSub = { fontSize: 12.5, color: "#6b7280", marginTop: 2 };

/* Payment */
const payRow = { display: "flex", gap: 10, flexWrap: "wrap" };
const payChip = { padding: "10px 14px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800, cursor: "pointer" };
const payOn = { background: "#eef2ff", borderColor: "#2563eb", color: "#1d4ed8", boxShadow: "0 2px 8px rgba(37,99,235,.18)" };

/* Radio */
const radioBase = { width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", boxSizing: "border-box", lineHeight: 0 };
const radioOn  = { background: "#2563eb", border: "2px solid #2563eb", boxShadow: "0 2px 10px rgba(37,99,235,.25)" };
const radioOff = { background: "#fff",     border: "2px solid #2563eb", boxShadow: "0 2px 8px rgba(37,99,235,.12)" };

/* Footer */
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
const orderBtn = {
  height: 46, padding: "0 22px",
  borderRadius: 12, border: "none",
  background: "#111827", color: "#fff",
  fontWeight: 800, fontSize: 16, cursor: "pointer",
  boxShadow: "0 10px 22px rgba(0,0,0,.25)",
};
