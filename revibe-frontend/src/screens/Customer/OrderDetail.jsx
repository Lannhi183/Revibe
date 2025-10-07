// src/screens/Customer/OrderDetail.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { getAuthHeaders } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE

const BUYER_ORDERS_KEY = "revibe.orders";
const SELLER_ORDERS_KEY = "revibe.orders.seller";

// Prices from backend are already VND
const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function OrderDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const role = params.get("role") === "seller" ? "seller" : "buyer";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizeStatus = (s = "") => {
    const k = String(s).toLowerCase();
    if (["to_confirm", "awaiting_confirmation", "pending_confirm"].includes(k)) return "to_confirm";
    if (["to_pay", "unpaid"].includes(k)) return "to_pay";
    if (["to_ship", "awaiting_shipment"].includes(k)) return "to_ship";
    if (["completed", "paid"].includes(k)) return "completed";
    if (["canceled", "cancelled"].includes(k)) return "canceled";
    return k || "";
  };

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/orders/${id}`, {
          headers: getAuthHeaders(),
        });
        if (res.status === 401) {
          setError("Unauthorized — token missing or expired. Paste valid token or login.");
          setOrder(null);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
        }
        const body = await res.json().catch(() => null);
        const doc = body?.data ?? body;
        if (!doc) throw new Error("Empty response from server");
        // normalize shape expected by UI
        setOrder({
          ...doc,
          id: doc._id || doc.id,
        });
      } catch (err) {
        setError(String(err.message || err));
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  const updateLocalOrder = (updater) => {
    setOrder((prev) => (prev ? updater({ ...prev }) : prev));
  };

  const onConfirmOrder = async () => {
    if (!window.confirm("Xác nhận đơn này?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ order_status: "to_ship" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
      }
      const body = await res.json().catch(() => null);
      const updated = body?.data ?? body;
      // update UI
      updateLocalOrder(() => ({ ...updated, id: updated._id || updated.id }));
      nav(`/orders?role=seller&status=to_ship`, { replace: true });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const onBuyerCancel = async () => {
    const ok = window.confirm("Bạn chắc chắn muốn hủy đơn này?");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
      }
      const body = await res.json().catch(() => null);
      const updated = body?.data ?? body;
      updateLocalOrder(() => ({ ...updated, id: updated._id || updated.id }));
      nav(`/orders?role=buyer&status=canceled`, { replace: true });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div style={{ padding: 20 }}>
        Loading…
      </div>
    );
  }

  if (error && !order) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
        <button onClick={() => { setError(null); /* retry */ window.location.reload(); }}>Thử lại</button>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: 20 }}>
        <b>Không tìm thấy đơn hàng</b>
      </div>
    );
  }

  const {
    items = [],
    address,
    shipping = {},
    totals = {},
    payment = {},
    status,
    timeline = [],
  } = order;

  const counterparty =
    role === "seller"
      ? order?.buyer?.name || order?.buyerName || ""
      : order?.seller?.name || order?.sellerName || "";

  const kStatus = normalizeStatus(status);
  const sc = statusColor(kStatus);
  const pillStyle = pill(sc.bg, sc.fg, sc.border);

  const isSellerToConfirm =
    role === "seller" && ["to_confirm", "awaiting_confirmation", "pending_confirm"].includes(String(status || "").toLowerCase());

  const isBuyerCancelable =
    role === "buyer" && ["to_confirm", "awaiting_confirmation", "pending_confirm"].includes(String(status || "").toLowerCase());

  return (
    <div style={page}>
      <header style={header}>
        <button onClick={() => nav(-1)} style={iconBtn} aria-label="Quay lại">←</button>
        <b>
          {role === "seller" ? "Đơn bán" : "Đơn hàng"} #{(order.id || "").toString().slice(-6)}
        </b>
        <div />
      </header>

      {/* Trạng thái */}
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <b>Trạng thái đơn</b>
          <span style={pillStyle}>{humanStatus(status)}</span>
        </div>

        {!!timeline?.length && (
          <div style={{ marginTop: 10 }}>
            {timeline.map((e, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "#2563eb" }} />
                <div style={{ fontSize: 13.5, color: "#0f172a" }}>{e?.label || e?.action || "Cập nhật"}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
                  {e?.t ? new Date(e.t).toLocaleString("vi-VN") : e?.at ? new Date(e.at).toLocaleString("vi-VN") : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Thông tin đối tác */}
      {counterparty && (
        <section style={card}>
          <b>{role === "seller" ? "Khách hàng" : "Người bán"}</b>
          <div style={{ marginTop: 8, fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
            {counterparty}
          </div>
        </section>
      )}

      {/* Địa chỉ */}
      <section style={card}>
        <b>{role === "seller" ? "Địa chỉ nhận của khách" : "Địa chỉ giao hàng"}</b>
        {address ? (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b>{address.receiver}</b>
              {address.phone && (
                <span style={{ ...chip, background: "#eef2ff", color: "#1d4ed8" }}>
                  {address.phone}
                </span>
              )}
            </div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              {[
                address.houseNo && `Số ${address.houseNo}`,
                address.street,
                address.ward,
                address.district,
                address.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
        ) : (
          <p style={{ color: "#64748b", marginTop: 8 }}>
            Chưa có địa chỉ.
          </p>
        )}
      </section>

      {/* Sản phẩm */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Sản phẩm</b>
          <span style={{ ...chip, background: "#111827", color: "#fff" }}>{items.length}</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 10, alignItems: "center" }}>
              <img
                src={it.image}
                alt={it.title}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  objectFit: "cover",
                  background: "#f3f4f6",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {it.title}
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>
                  {[it.color, it.size].filter(Boolean).join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 900 }}>
                {it.qty > 1 && <span style={{ marginRight: 6, color: "#64748b", fontWeight: 600 }}>×{it.qty}</span>}
                {fmtVND(Number(it.price || 0))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Thanh toán & vận chuyển */}
      <section style={card}>
        <b>Thanh toán & vận chuyển</b>
        <div style={{ marginTop: 8 }}>
          <Row label="Phương thức" value={payment?.method === "cod" ? "COD (khi nhận hàng)" : "VietQR"} />
          <Row label="Trạng thái thanh toán" value={humanPayment(payment?.status)} />
          <Row label="Kiểu vận chuyển" value={shipping?.type === "express" ? "Nhanh (1–2 ngày)" : "Tiêu chuẩn (5–7 ngày)"} />
          <Row label="Phí vận chuyển" value={fmtVND(Number(shipping?.fee || 0))} />
        </div>

        <div style={{ marginTop: 10, borderTop: "1px dashed #e2e8f0", paddingTop: 10 }}>
          <Row label="Tạm tính" value={fmtVND(Number(totals?.itemsTotal || 0))} />
          <Row label="Vận chuyển" value={fmtVND(Number(totals?.shipping || 0))} />
          <Row label={<b>Tổng cộng</b>} value={<b>{fmtVND(Number(totals?.grandTotal || 0))}</b>} />
        </div>
      </section>

      {/* ===== Nút hành động ===== */}
      {isSellerToConfirm && (
        <section style={{ ...card, display: "grid", gap: 10 }}>
          <button onClick={onConfirmOrder} style={btnPrimary} disabled={loading}>
            {loading ? "Đang xử lý…" : "Xác nhận đơn"}
          </button>
        </section>
      )}

      {isBuyerCancelable && (
        <section style={{ ...card, display: "grid", gap: 10 }}>
          <button onClick={onBuyerCancel} style={{ ...btnPrimary, background: "#ef4444", borderColor: "#ef4444" }} disabled={loading}>
            {loading ? "Đang xử lý…" : "Hủy đơn"}
          </button>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>Bạn chỉ có thể hủy khi người bán chưa xác nhận.</div>
        </section>
      )}

      <div style={{ height: 18 }} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "6px 0",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

/* ===== Helpers (mapping trạng thái) ===== */
function humanStatus(s = "") {
  const k = String(s).toLowerCase();
  if (k === "to_confirm" || k === "awaiting_confirmation" || k === "pending_confirm")
    return "Chờ xác nhận";
  if (k === "to_pay") return "Chờ thanh toán";
  if (k === "to_ship") return "Chờ vận chuyển";
  if (k === "completed") return "Hoàn thành";
  if (k === "canceled" || k === "cancelled") return "Đã hủy";
  if (k === "paid") return "Đã thanh toán";
  if (k === "awaiting_shipment") return "Chờ người bán giao";
  if (k === "completed_old") return "Hoàn tất";
  return s || "—";
}

function humanPayment(s = "") {
  const k = String(s).toUpperCase();
  if (k === "PAID") return "Đã thanh toán";
  if (k === "UNPAID") return "Chưa thanh toán";
  if (k === "COD_PENDING") return "Chờ thu hộ COD";
  return s || "—";
}

function statusColor(s = "") {
  const k = String(s).toLowerCase();
  if (k === "to_confirm" || k === "awaiting_confirmation" || k === "pending_confirm")
    return { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" }; // vàng nhạt
  if (k === "to_pay" || k === "unpaid")
    return { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" };
  if (k === "to_ship" || k === "awaiting_shipment")
    return { bg: "#ecfeff", fg: "#0891b2", border: "#a5f3fc" };
  if (k === "completed" || k === "paid")
    return { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" };
  if (k === "canceled" || k === "cancelled")
    return { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" };
  return { bg: "#f3f4f6", fg: "#0f172a", border: "#e5e7eb" };
}

/* ===== Styles ===== */
const page = {
  margin: "0 auto",
  maxWidth: 600,
  width: "100%",
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
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};
const card = {
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 4px 24px rgba(0,0,0,.08)",
  border: "1px solid #f1f5f9",
  marginTop: 12,
};
const pill = (bg, fg, border) => ({
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: bg,
  color: fg,
  boxShadow: `inset 0 0 0 1px ${border}`,
});
const chip = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};
const btnPrimary = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};
