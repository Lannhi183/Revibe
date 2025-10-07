import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, isAuthenticated } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1"

const buildHeaders = () => {
  return getAuthHeaders();
}

/* ================= Keys & helpers ================= */
const CHECKOUT_INTENT_KEY = "revibe.checkout.intent";
const ORDERS_KEY = "revibe.orders";
const LAST_ORDER_KEY = "revibe.last_order";

// VND formatter
const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

// mm:ss
const fmtSec = (s) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.max(0, Math.floor(s % 60))).padStart(2, "0");
  return `${m}:${ss}`;
};

// viewport hook (responsive inline styles)
function useViewportW() {
  const [w, setW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 375
  );
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return w;
}

export default function Payment() {
  const nav = useNavigate();
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const d = JSON.parse(localStorage.getItem(CHECKOUT_INTENT_KEY) || "null");
    if (!d) return nav("/checkout");
    setDraft(d);
  }, [nav]);

  // grandTotal đã là VND từ Checkout → chỉ format
  const amount = useMemo(() => {
    if (!draft?.totals?.grandTotal) return 0;
    return Math.round(Number(draft.totals.grandTotal));
  }, [draft]);

  if (!draft) return null;
  const method = draft.payment?.method || "online";

  return (
    <div style={page}>
      <header style={header}>
        <button onClick={() => nav(-1)} style={iconBtn} aria-label="Quay lại">←</button>
        <b>Thanh toán</b>
        <div />
      </header>

      {/* Order summary */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <b>Tổng thanh toán</b>
          <div style={{ fontWeight: 900 }}>{fmtVND(amount)}</div>
        </div>
        <div style={{ fontSize: 13, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {(draft.items?.length || 0)} sản phẩm • {draft.address?.district}, {draft.address?.city}
        </div>
      </section>

      {/* Method panel */}
      {method === "online" ? (
        <VietQRPanel amount={amount} order={draft.order} initialPayment={draft.payment}s onDone={() => onPaidSuccess(nav)} />
      ) : (
        <CODPanel amount={amount} onDone={() => onCodConfirm(nav)} />
      )}
    </div>
  );
}

/* ================= VietQR Panel (responsive) ================= */
function VietQRPanel({ amount, onDone, order = null, initialPayment = null }) {
  const vw = useViewportW();
  const isNarrow = vw <= 480;
  const qrSize = Math.max(160, Math.min(260, Math.floor(vw - 56)));

  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState(null); // { qrImage, deeplink, txnRef, expiresAt, bank }
  const [secLeft, setSecLeft] = useState(0);
  const [status, setStatus] = useState("waiting"); // waiting | captured | expired | error
  const expired = status !== "captured" && secLeft === 0;

  // init QR
  // init QR: prefer server-provided payment.provider_payload
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (initialPayment && initialPayment.provider_payload) {
          const p = initialPayment.provider_payload;
          // Map common fields: qr_url / qrImage, deeplink, transaction_id / txnRef, expiresAt
          const mapped = {
            qrImage: p.qr_url || p.qrImage || p.qr || "",
            deeplink: p.deeplink || p.deeplink_url || p.deeplinkUrl || "",
            txnRef: p.transaction_id || p.txnRef || p.txn_id || "",
            expiresAt: p.expiresAt || p.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            bank: p.bank || p.provider_bank || { name: p.bank_name || "Bank" },
          };
          if (!mounted) return;
          setQr(mapped);
          setSecLeft(Math.max(0, Math.floor((new Date(mapped.expiresAt) - Date.now()) / 1000)));
          setStatus("waiting");
        } else {
          // fallback to demo/mock QR
          const r = await mockInitVietQR({ amount });
          if (!mounted) return;
          setQr(r);
          setSecLeft(Math.max(0, Math.floor((new Date(r.expiresAt) - Date.now()) / 1000)));
          setStatus("waiting");
        }
      } catch {
        setStatus("error");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [amount, initialPayment]);

  // countdown
  useEffect(() => {
    if (secLeft <= 0) return;
    const t = setInterval(() => setSecLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secLeft]);

  // poll (demo). Sản phẩm thật: dựa webhook, client chỉ fetch trạng thái đơn.
  // useEffect(() => {
  //   if (!qr?.txnRef || status !== "waiting") return;
  //   const iv = setInterval(async () => {
  //     const st = await mockPollPayment(qr.txnRef);
  //     if (st === "CAPTURED") {
  //       setStatus("captured");
  //       onDone?.();s
  //     }
  //   }, 2500);
  //   return () => clearInterval(iv);
  // }, [qr?.txnRef, status, onDone]);

  const regenerate = async () => {
    if (!qr?.txnRef) return;
    setLoading(true);
    try {
      // call backend to (re)create payment for this order (will return payment with provider_payload)
      if (!order || !order._id) {
        const r = await mockRegenerate(qr.txnRef, amount);
        setQr(r);
        setSecLeft(Math.max(0, Math.floor((new Date(r.expiresAt) - Date.now()) / 1000)));
        setStatus("waiting");
      } else {
        if (!isAuthenticated()) {
          throw new Error("Not authenticated");
        }
        const res = await fetch(`${API_BASE}/orders/${order._id}/payment`, {
          method: "POST",
          headers: buildHeaders(),
        });
        if (res.ok) {
          const pb = await res.json().catch(() => null);
          const payment = (pb && (pb.data ?? pb)) || null;
          const p = payment?.provider_payload || {};
          const mapped = {
            qrImage: p.qr_url || p.qrImage || "",
            deeplink: p.deeplink || "",
            txnRef: p.transaction_id || p.txnRef || "",
            expiresAt: p.expiresAt || p.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            bank: p.bank || { name: p.bank_name || "Bank", accountNo: p.accountNo || p.accountNo },
          };
          setQr(mapped);
          setSecLeft(Math.max(0, Math.floor((new Date(mapped.expiresAt) - Date.now()) / 1000)));
          setStatus("waiting");
        } else {
          throw new Error("Regenerate failed");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmTransfer = async () => {
    // call backend confirm endpoint: POST /orders/:id/payment/confirm
    if (!order || !order._id) {
      alert("Không có thông tin đơn hàng để xác nhận. Vui lòng thử lại.");
      return;
    }
    if (!isAuthenticated()) {
      alert("Vui lòng đăng nhập trước khi xác nhận thanh toán.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${order._id}/payment/confirm`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (body && (body.error || body.message)) || `HTTP ${res.status}`;
        alert(`Xác nhận thất bại: ${err}`);
        return;
      }
      // success -> mark captured and call onDone
      setStatus("captured");
      onDone?.();
    } catch (e) {
      console.warn("confirmTransfer error", e);
      alert("Không thể xác nhận thanh toán. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b>VietQR (Napas 24/7)</b>
        <span style={pill(status === "captured" ? "#16a34a" : expired ? "#dc2626" : "#2563eb")}>
          {status === "captured" ? "Đã nhận thanh toán" : expired ? "QR đã hết hạn" : `Hết hạn sau ${fmtSec(secLeft)}`}
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          flexDirection: isNarrow ? "column" : "row",
          minWidth: 0,
        }}
      >
        {/* QR */}
        <div style={{ ...qrBox, width: isNarrow ? "100%" : qrSize, alignSelf: isNarrow ? "stretch" : "flex-start" }}>
          <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: "#f8fafc", display: "grid", placeItems: "center" }}>
            {qr?.qrImage ? (
              <img src={qr.qrImage} alt="VietQR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ color: "#94a3b8" }}>QR Preview</div>
            )}
          </div>
        </div>

        {/* Info + actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <InfoRow label="Số tiền" value={fmtVND(amount)} />
          <InfoRow label="Mã tham chiếu" value={qr?.txnRef || "—"} copy />
          <InfoRow label="Nội dung" value={qr ? `REVIBE-${qr.txnRef}` : "—"} copy />
          <InfoRow label="Ngân hàng" value={qr?.bank?.name || "—"} />
          <InfoRow label="Số TK nhận" value={qr?.bank?.accountNo || "—"} copy />

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={qr?.deeplink || "#"}
              target="_blank"
              rel="noreferrer"
              style={{ ...btnPrimary, width: isNarrow ? "100%" : "auto", textAlign: "center" }}
            >
              Mở app ngân hàng
            </a>
            {expired && (
              <button style={{ ...btnGhost, width: isNarrow ? "100%" : "auto" }} onClick={regenerate}>
                Tạo lại QR
              </button>
            )}
            {status === "waiting" && (
              <button
                style={{ ...btnGhost, width: isNarrow ? "100%" : "auto" }}
                onClick={confirmTransfer}
              >
                Tôi đã chuyển
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Đang khởi tạo QR…</div>}
    </section>
  );
}

/* ================= COD Panel ================= */
function CODPanel({ amount, onDone }) {
  const vw = useViewportW();
  const isNarrow = vw <= 480;
  return (
    <section style={card}>
      <b>COD – Thanh toán khi nhận hàng</b>
      <p style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>
        Đơn vị vận chuyển sẽ thu hộ khi giao hàng thành công.
      </p>
      <div style={{ marginTop: 10, padding: 10, border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tổng cần thanh toán</span>
          <b>{fmtVND(amount)}</b>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          style={{ ...btnPrimary, width: isNarrow ? "100%" : "auto" }}
          onClick={() => {
            alert("Đã xác nhận COD. Đơn sẽ chuyển sang trạng thái chờ giao.");
            onDone?.();
          }}
        >
          Xác nhận COD
        </button>
      </div>
    </section>
  );
}

/* ================= Helpers/UI ================= */
function InfoRow({ label, value, copy }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#64748b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "rtl" }}>
          {value}
        </span>
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(String(value || ""))}
            style={{ fontSize: 12, color: "#2563eb", background: "transparent", border: "none", cursor: "pointer" }}
          >
            Copy
          </button>
        )}
      </span>
    </div>
  );
}

function onPaidSuccess(nav) {
  const draft = JSON.parse(localStorage.getItem(CHECKOUT_INTENT_KEY) || "null");
  const orderId = persistOrder(draft, {
    paymentStatus: "PAID",
    orderStatus: "PAID",
  });
  localStorage.removeItem(CHECKOUT_INTENT_KEY);
  nav(`/order/${orderId}`);
}

function onCodConfirm(nav) {
  const draft = JSON.parse(localStorage.getItem(CHECKOUT_INTENT_KEY) || "null");
  const orderId = persistOrder(draft, {
    paymentStatus: "COD_PENDING",
    orderStatus: "AWAITING_SHIPMENT",
  });
  localStorage.removeItem(CHECKOUT_INTENT_KEY);
  nav(`/order/${orderId}`);
}

/** Lưu đơn vào localStorage và trả về orderId (totals giữ nguyên VND) */
function persistOrder(draft, { paymentStatus, orderStatus }) {
  const now = new Date().toISOString();
  const orderId = `RVB_${Date.now().toString(36).toUpperCase()}`;
  const order = {
    id: orderId,
    createdAt: now,
    status: orderStatus,
    items: draft?.items || [],
    address: draft?.address || null,
    shipping: { ...(draft?.shipping || {}), status: "PENDING" },
    totals: draft?.totals || { itemsTotal: 0, shipping: 0, grandTotal: 0 }, // VND
    payment: {
      method: draft?.payment?.method || "vietqr",
      status: paymentStatus,
      providerRef: null,
    },
    timeline: [
      { t: now, label: "Đã tạo đơn" },
      { t: now, label: paymentStatus === "PAID" ? "Đã thanh toán" : "Xác nhận COD" },
    ],
  };
  const list = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  list.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  return orderId;
}

/* ================= Mock API (thay bằng API thật) ================= */
async function mockInitVietQR({ amount }) {
  await sleep(400);
  return {
    qrImage: "", // URL/base64 từ PSP; để trống sẽ hiển thị "QR Preview"
    deeplink: "https://www.vietqr.io/",
    txnRef: `VQR_${Date.now().toString(36).toUpperCase()}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    bank: { name: "Vietcombank", accountNo: "0123456789", accountName: "CTY CP REVIBE" },
  };
}
let mockCaptureAt = Date.now() + 8000;
async function mockPollPayment() {
  await sleep(250);
  return Date.now() > mockCaptureAt ? "CAPTURED" : "PENDING";
}
async function mockRegenerate() {
  await sleep(300);
  mockCaptureAt = Date.now() + 12000;
  return {
    qrImage: "",
    deeplink: "https://www.vietqr.io/",
    txnRef: `VQR_${Date.now().toString(36).toUpperCase()}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    bank: { name: "Vietcombank", accountNo: "0123456789", accountName: "CTY CP REVIBE" },
  };
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ================= Inline styles ================= */
const page = {
  margin: "0 auto",
  maxWidth: 600,
  width: "100%",
  padding: "12px 14px env(safe-area-inset-bottom)",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#0f172a",
};
const header = { display: "grid", gridTemplateColumns: "28px 1fr 28px", alignItems: "center", marginBottom: 6 };
const iconBtn = { width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" };
const card = { background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 4px 24px rgba(0,0,0,.08)", border: "1px solid #f1f5f9", marginTop: 12 };
const pill = (bg) => ({ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, color: "#fff", background: bg, whiteSpace: "nowrap" });
const qrBox = { padding: 8, borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 8px 18px rgba(0,0,0,.06)", background: "#fff" };
const btnPrimary = { padding: "12px 14px", borderRadius: 10, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#fff", fontWeight: 800, cursor: "pointer" };
const btnGhost = { padding: "12px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#111827", fontWeight: 800, cursor: "pointer" };
