// src/screens/Customer/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAuthHeaders, getAccessToken, isAuthenticated } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

/* ================== constants ================== */
const BUY_ORDERS_KEY = "revibe.orders";
const SELL_ORDERS_KEY = "revibe.orders.seller";
const LAST_ORDER_KEY = "revibe.last_order";

// Tabs cho người mua
const STATUSES_BUYER = [
  { key: "to_pay",    label: "Chờ thanh toán" },
  { key: "to_ship",   label: "Chờ vận chuyển" },
  { key: "completed", label: "Hoàn thành" },
  { key: "canceled",  label: "Đã hủy" },
];
// Tabs cho người bán (➕ thêm “Chờ xác nhận”)
const STATUSES_SELLER = [
  { key: "to_confirm", label: "Chờ xác nhận" },
  { key: "to_pay",     label: "Chờ thanh toán" },
  { key: "to_ship",    label: "Chờ vận chuyển" },
  { key: "completed",  label: "Hoàn thành" },
  { key: "canceled",   label: "Đã hủy" },
];

/** VNĐ formatter: 1 đơn vị giá demo = 1.000₫ (có thể đổi) */
// Prices from backend are already in VND. Format numbers directly.
const fmtVND = (n) => `${Math.round(Number(n || 0)).toLocaleString("vi-VN")} ₫`;

/* ===== status helpers (đồng bộ tên khoá) ===== */
const normalizeStatus = (s = "") => {
  const k = String(s).toLowerCase();
  if (["to_confirm", "awaiting_confirmation", "pending_confirm"].includes(k)) return "to_confirm";
  if (["to_pay", "unpaid"].includes(k)) return "to_pay";
  if (["to_ship", "awaiting_shipment"].includes(k)) return "to_ship";
  if (["completed", "paid"].includes(k)) return "completed";
  if (["canceled", "cancelled"].includes(k)) return "canceled";
  return "to_pay";
};

const statusStyle = (key) => {
  switch (key) {
    case "to_confirm":
      return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    case "to_pay":
      return { bg: "#eef2ff", color: "#1d4ed8", border: "#bfdbfe" };
    case "to_ship":
      return { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" };
    case "completed":
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
    case "canceled":
    default:
      return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  }
};

/* ================== seed helpers ================== */
// Seed dữ liệu mẫu cho người bán
function seedSellerOrders() {
  const seeded = [
    {
      id: "S-1001",
      status: "to_confirm",
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      buyer: { name: "Nguyễn An", phone: "0901 234 567" },
      seller: { name: "Bạn" },
      items: [
        { title: "Đầm mùa hè", image: "/images/product3.jpg", price: 19, qty: 1, color: "Xanh", size: "M" },
      ],
      shipping: { type: "standard", fee: 2.0 },
      totals: { itemsTotal: 19, shipping: 2, grandTotal: 21 },
      payment: { method: "cod", status: "UNPAID" },
      timeline: [{ t: Date.now() - 1000 * 60 * 60 * 6, label: "Khách đặt hàng" }],
    },
    {
      id: "S-1002",
      status: "to_pay",
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      buyer: { name: "Bảo Trân" },
      seller: { name: "Bạn" },
      items: [
        { title: "Áo thun unisex", image: "/images/product5.jpg", price: 12, qty: 2, color: "Trắng", size: "L" },
        { title: "Túi đeo chéo", image: "/images/product6.jpg", price: 19, qty: 1, color: "Đen", size: "One size" },
      ],
      shipping: { type: "standard", fee: 3.5 },
      totals: { itemsTotal: 43, shipping: 3.5, grandTotal: 46.5 },
      payment: { method: "vietqr", status: "UNPAID" },
      timeline: [{ t: Date.now() - 1000 * 60 * 60 * 22, label: "Khách đặt hàng" }],
    },
    {
      id: "S-1003",
      status: "to_ship",
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      buyer: { name: "Trần Chí" },
      seller: { name: "Bạn" },
      items: [{ title: "Giày cao gót", image: "/images/product4.jpg", price: 17, qty: 1, color: "Be", size: "38" }],
      shipping: { type: "express", fee: 4.0 },
      totals: { itemsTotal: 17, shipping: 4, grandTotal: 21 },
      payment: { method: "vietqr", status: "PAID" },
      timeline: [
        { t: Date.now() - 1000 * 60 * 60 * 44, label: "Khách thanh toán" },
        { t: Date.now() - 1000 * 60 * 60 * 40, label: "Chờ người bán giao" },
      ],
    },
    {
      id: "S-1004",
      status: "completed",
      createdAt: Date.now() - 1000 * 60 * 60 * 72,
      buyer: { name: "Lê Na" },
      seller: { name: "Bạn" },
      items: [{ title: "Váy mùa hè", image: "/images/product1.jpg", price: 17, qty: 1, color: "Hồng", size: "S" }],
      shipping: { type: "express", fee: 3.0 },
      totals: { itemsTotal: 17, shipping: 3, grandTotal: 20 },
      payment: { method: "cod", status: "PAID" },
      timeline: [{ t: Date.now() - 1000 * 60 * 60 * 70, label: "Đã giao thành công" }],
    },
    {
      id: "S-1005",
      status: "canceled",
      createdAt: Date.now() - 1000 * 60 * 60 * 96,
      buyer: { name: "Đặng Huy" },
      seller: { name: "Bạn" },
      items: [{ title: "Áo khoác denim", image: "/images/product7.jpg", price: 29, qty: 1, color: "Xanh nhạt", size: "XL" }],
      shipping: { type: "standard", fee: 0 },
      totals: { itemsTotal: 29, shipping: 0, grandTotal: 29 },
      payment: { method: "vietqr", status: "UNPAID" },
      timeline: [{ t: Date.now() - 1000 * 60 * 60 * 95, label: "Khách hủy đơn" }],
    },
  ];
  localStorage.setItem(SELL_ORDERS_KEY, JSON.stringify(seeded));
  return seeded;
}

/**
 * Seed dữ liệu cho người mua:
 *  - B-9101: trạng thái to_ship nhưng CHỈ CHO HỦY (không cho nhận hàng)
 *  - B-9102: trạng thái to_ship nhưng CHỈ CHO "Đã nhận hàng" (không cho hủy)
 * Dùng trường actions để điều khiển nút hiển thị theo từng đơn.
 */
function seedBuyerOrders() {
  const seeded = [
    {
      id: "B-9101",
      status: "to_ship",
      createdAt: Date.now() - 1000 * 60 * 60 * 5,
      buyer: { name: "Bạn" },
      seller: { name: "Shop B" },
      items: [
        { title: "Áo polo cổ bẻ", image: "/images/product9.jpg", price: 15, qty: 1, color: "Trắng", size: "L" },
      ],
      shipping: { type: "standard", fee: 1.5 },
      totals: { itemsTotal: 15, shipping: 1.5, grandTotal: 16.5 },
      payment: { method: "vietqr", status: "PAID" },
      timeline: [
        { t: Date.now() - 1000 * 60 * 60 * 5, label: "Đặt hàng thành công" },
        { t: Date.now() - 1000 * 60 * 60 * 4, label: "Đơn đang chờ người bán giao" },
      ],
      actions: { allowCancel: true, allowReceive: false }, // ✅ chỉ hiện Hủy đơn
    },
    {
      id: "B-9102",
      status: "to_ship",
      createdAt: Date.now() - 1000 * 60 * 60 * 8,
      buyer: { name: "Bạn" },
      seller: { name: "Shop C" },
      items: [
        { title: "Giày sneaker", image: "/images/product10.jpg", price: 28, qty: 1, color: "Đen", size: "42" },
      ],
      shipping: { type: "express", fee: 3.0 },
      totals: { itemsTotal: 28, shipping: 3, grandTotal: 31 },
      payment: { method: "vietqr", status: "PAID" },
      timeline: [
        { t: Date.now() - 1000 * 60 * 60 * 8, label: "Đặt hàng thành công" },
        { t: Date.now() - 1000 * 60 * 60 * 6, label: "Đơn đang chờ người bán giao" },
      ],
      actions: { allowCancel: false, allowReceive: true }, // ✅ chỉ hiện Đã nhận hàng
    },
  ];
  localStorage.setItem(BUY_ORDERS_KEY, JSON.stringify(seeded));
  return seeded;
}

/* ================== data helpers ================== */
const loadOrders = (role) => {
  const key = role === "seller" ? SELL_ORDERS_KEY : BUY_ORDERS_KEY;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

// map UI tab key -> backend Order.order_status
const uiToOrderStatus = (uiKey) => {
  switch (uiKey) {
    case "to_pay": // buyer waiting payment
    case "to_confirm": // seller needs to confirm (created)
      return "pending";
    case "to_ship": // seller confirmed / preparing / shipped
      return "processing";
    case "completed":
      return "completed";
    case "canceled":
      return "canceled";
    default:
      return undefined;
  }
};

// map backend order doc -> UI tab key
const orderToUiStatus = (o = {}) => {
  const os = String(o.order_status || "").toLowerCase();
  const ps = String(o.payment_status || "").toLowerCase();

  if (os === "pending" && ps === "pending") return "to_pay";
  if (os === "pending" && ps !== "pending") return "to_confirm";
  if (os === "processing") return "to_ship";
  if (os === "shipped" || os === "delivered") return "to_ship";
  if (os === "completed") return "completed";
  if (os === "canceled") return "canceled";
  return "to_pay";
};

// new: build auth headers
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

// fetch orders from backend (supports role & status)
async function fetchOrdersFromApi({ role, userId, status, page = 1, limit = 50 }) {
  const qs = new URLSearchParams();
  if (role === "buyer") qs.set("buyerId", userId);
  else qs.set("sellerId", userId);
  // status here must be backend order_status (e.g. pending, processing, completed, canceled)
  if (status) qs.set("status", status);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/orders?${qs.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = await res.json().catch(() => null);
    throw new Error((b && b.error) || `HTTP ${res.status}`);
  }
  const body = await res.json().catch(() => null);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (body.data && Array.isArray(body.data.data)) return body.data.data;

  // fallback empty
  return [];
}

// fetch single order detail
async function fetchOrderDetailFromApi(orderId) {
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = await res.json().catch(() => null);
    throw new Error((b && b.error) || `HTTP ${res.status}`);
  }
  const body = await res.json();
  return (body && (body.data ?? body)) || body;
}

const computeAmount = (o) => {
  if (o?.totals?.grandTotal != null) return Number(o.totals.grandTotal);
  const itemsTotal = (o?.items || []).reduce(
    (s, it) => s + Number(it.price || 0) * Number(it.qty || 0),
    0
  );
  const shipping = Number(o?.totals?.shipping || o?.shipping?.fee || 0);
  return itemsTotal + shipping;
};

/* ================== component ================== */
export default function Orders() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();

  const role = params.get("role") === "seller" ? "seller" : "buyer"; // buyer | seller
  const TABS = role === "seller" ? STATUSES_SELLER : STATUSES_BUYER;
  const fallbackStatus = TABS[0].key; // khác nhau theo role
  const current = params.get("status") || fallbackStatus;

  const [orders, setOrders] = useState(() => loadOrders(role));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Seed dữ liệu mẫu nếu trống
  // useEffect(() => {
  //   if (role === "seller") {
  //     const now = loadOrders("seller");
  //     if (!Array.isArray(now) || now.length === 0) {
  //       const seeded = seedSellerOrders();
  //       setOrders(seeded);
  //     }
  //   } else {
  //     const now = loadOrders("buyer");
  //     if (!Array.isArray(now) || now.length === 0) {
  //       const seeded = seedBuyerOrders(); // ✅ tạo 2 đơn to_ship theo yêu cầu
  //       setOrders(seeded);
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [role]);

  // fetch from backend when authenticated or fallback to seed/local
  useEffect(() => {
    if (!isAuthenticated()) {
      // unauthenticated -> use seed/local (existing behavior)
      const local = loadOrders(role);
      if (!Array.isArray(local) || local.length === 0) {
        if (role === "seller") setOrders(seedSellerOrders());
        else setOrders(seedBuyerOrders());
      } else {
        setOrders(local);
      }
      return;
    }

    // authenticated -> call backend
    const token = getAccessToken();
    const payload = parseJwt(token);
    const uid = payload?.sub;
    if (!uid) {
      setError("Invalid token");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // convert UI tab key -> backend order_status
        const backendStatus = uiToOrderStatus(current);
        const arr = await fetchOrdersFromApi({ role, userId: uid, status: backendStatus });
        if (!mounted) return;
        // map backend docs to UI shape (keep compatibility with seeded shape)
        const mapped = (arr || []).map((o) => ({
          id: o._id || o.id,
          // normalize backend doc -> UI tab key
          status: orderToUiStatus(o),
          createdAt: new Date(o.created_at || o.createdAt).getTime(),
          buyer: { name: o.buyer_id?.name || undefined },
          seller: { name: o.seller_id?.name || undefined },
          items: (o.items || []).map((it) => ({ title: it.title, image: it.image, price: it.price, qty: it.qty })),
          shipping: { type: o.shipping?.type || "standard", fee: o.amounts?.shipping || 0 },
          totals: { itemsTotal: o.amounts?.subtotal || 0, shipping: o.amounts?.shipping || 0, grandTotal: o.amounts?.total || 0 },
          payment: { method: o.payment_method || (o.payment?.method), status: o.payment_status || (o.payment && o.payment.status) },
          raw: o, // keep original for later detail
        }));
        setOrders(mapped);
      } catch (err) {
        setError(String(err.message || err));
        // fallback to local seed
        const local = loadOrders(role);
        setOrders(local);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, current]);

  // sync khi quay lại app / thay đổi storage / đổi role
  // fetch from backend when authenticated or fallback to seed/local
  useEffect(() => {
    if (!isAuthenticated()) {
      // unauthenticated -> use seed/local (existing behavior)
      const local = loadOrders(role);
      if (!Array.isArray(local) || local.length === 0) {
        if (role === "seller") setOrders(seedSellerOrders());
        else setOrders(seedBuyerOrders());
      } else {
        setOrders(local);
      }
      return;
    }

    // authenticated -> call backend
    const token = getAccessToken();
    const payload = parseJwt(token);
    const uid = payload?.sub;
    if (!uid) {
      setError("Invalid token");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const backendStatus = uiToOrderStatus(current);
        const arr = await fetchOrdersFromApi({ role, userId: uid, status: backendStatus });
        if (!mounted) return;
        // map backend docs to UI shape (keep compatibility with seeded shape)
        const mapped = (arr || []).map((o) => ({
          id: o._id || o.id,
          status: orderToUiStatus(o),
          createdAt: new Date(o.created_at || o.createdAt).getTime(),
          buyer: { name: o.buyer_id?.name || undefined },
          seller: { name: o.seller_id?.name || undefined },
          items: (o.items || []).map((it) => ({ title: it.title, image: it.image, price: it.price, qty: it.qty })),
          shipping: { type: o.shipping?.type || "standard", fee: o.amounts?.shipping || 0 },
          totals: { itemsTotal: o.amounts?.subtotal || 0, shipping: o.amounts?.shipping || 0, grandTotal: o.amounts?.total || 0 },
          payment: { method: o.payment_method || (o.payment?.method), status: o.payment_status || (o.payment && o.payment.status) },
          raw: o, // keep original for later detail
        }));
        setOrders(mapped);
      } catch (err) {
        setError(String(err.message || err));
        // fallback to local seed
        const local = loadOrders(role);
        setOrders(local);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, current]);

  // open detail: prefetch detail from API when authed, store last order and navigate
  const openDetail = async (orderId) => {
    try {
      if (isAuthenticated()) {
        const detail = await fetchOrderDetailFromApi(orderId);
        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(detail));
      } else {
        // unauth -> try to find in local list and persist
        const found = orders.find((o) => String(o.id) === String(orderId));
        if (found) localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(found));
      }
    } catch (e) {
      // ignore fetch error, still navigate to detail page which can handle missing data
      console.warn("prefetch order detail failed", e);
    } finally {
      nav(`/order/${orderId}?role=${role}`);
    }
  };

  const setStatus = (key) => {
    params.set("status", key);
    params.set("role", role);
    setParams(params, { replace: true });
  };
  const setRole = (r) => {
    params.set("role", r);
    // khi đổi role, nếu status hiện tại không thuộc tabs mới thì reset về tab đầu của role đó
    const nextTabs = r === "seller" ? STATUSES_SELLER : STATUSES_BUYER;
    if (!nextTabs.some((t) => t.key === params.get("status"))) {
      params.set("status", nextTabs[0].key);
    }
    setParams(params, { replace: true });
  };

  // Buyer xác nhận đã nhận hàng → completed
  const markAsReceived = async (orderId) => {
    if (role !== "buyer") return;
    if (!isAuthenticated()) {
      // fallback local behavior
      const list = loadOrders("buyer");
      const next = (list || []).map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "completed",
              timeline: [...(o.timeline || []), { t: Date.now(), label: "Người mua xác nhận đã nhận hàng" }],
            }
          : o
      );
      localStorage.setItem(BUY_ORDERS_KEY, JSON.stringify(next));
      setOrders(loadOrders(role));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/receive`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
      }
      // optimistic update in UI
      setOrders((prev) =>
        (prev || []).map((o) =>
          String(o.id) === String(orderId)
            ? { ...o, status: "completed", timeline: [...(o.timeline || []), { t: Date.now(), label: "Người mua xác nhận đã nhận hàng" }] }
            : o
        )
      );
    } catch (e) {
      console.warn("markAsReceived error", e);
      alert("Không thể xác nhận đã nhận. Vui lòng thử lại.");
    }
  };

  // Buyer hủy đơn (call API when authed)
  const cancelOrder = async (orderId) => {
    if (role !== "buyer") return;
    if (!isAuthenticated()) {
      // fallback local behavior
      const list = loadOrders("buyer");
      const next = (list || []).map((o) => {
        const st = normalizeStatus(o.status);
        const allowCancelInShip = st === "to_ship" && o?.actions?.allowCancel === true;
        const cancellable = ["to_pay", "to_confirm"].includes(st) || allowCancelInShip;
        if (o.id === orderId && cancellable) {
          return {
            ...o,
            status: "canceled",
            timeline: [...(o.timeline || []), { t: Date.now(), label: "Người mua hủy đơn" }],
            payment: { ...(o.payment || {}), status: "REFUND_IF_PAID" },
          };
        }
        return o;
      });
      localStorage.setItem(BUY_ORDERS_KEY, JSON.stringify(next));
      setOrders(loadOrders(role));
      return;
    }

    // authenticated -> call backend
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((body && (body.error || body.message)) || `HTTP ${res.status}`);
      }
      // optimistic UI update
      setOrders((prev) =>
        (prev || []).map((o) =>
          String(o.id) === String(orderId)
            ? { ...o, status: "canceled", timeline: [...(o.timeline || []), { t: Date.now(), label: "Người mua hủy đơn" }] }
            : o
        )
      );
    } catch (e) {
      console.warn("cancelOrder error", e);
      alert("Không thể huỷ đơn. Vui lòng thử lại.");
    }
  };

  const filtered = useMemo(() => {
    return (orders || []).filter((o) => normalizeStatus(o?.status) === current);
  }, [orders, current]);

  return (
    <div style={st.page}>
      {/* Header */}
      <header style={st.header}>
        <button aria-label="Quay lại" onClick={() => nav(-1)} style={st.backBtn}>
          ←
        </button>
        <h2 style={st.title}>{role === "seller" ? "Đơn bán" : "Đơn hàng của tôi"}</h2>
        <div style={{ width: 28 }} />
      </header>

      {/* Switch Buyer/Seller */}
      <div style={st.roleRow}>
        <button
          onClick={() => setRole("buyer")}
          style={{ ...st.roleBtn, ...(role === "buyer" ? st.roleBtnActive : {}) }}
        >
          Mua
        </button>
        <button
          onClick={() => setRole("seller")}
          style={{ ...st.roleBtn, ...(role === "seller" ? st.roleBtnActive : {}) }}
        >
          Bán
        </button>
      </div>

      {/* Tabs trạng thái */}
      <div style={st.tabsWrap}>
        {TABS.map((s) => {
          const isActive = s.key === current;
          return (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              style={{ ...st.tabBtn, ...(isActive ? st.tabBtnActive : {}) }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Danh sách đơn */}
      <div style={{ padding: "0 14px 110px" }}>
        {filtered.length === 0 ? (
          <div style={st.empty}>
            <img src="/images/revibe-logo.png" alt="Revibe" style={st.emptyImg} />
            <div style={st.emptyTitle}>
              {role === "buyer" ? "Chưa có đơn ở trạng thái này" : "Chưa có đơn bán ở trạng thái này"}
            </div>
            <Link to="/home" style={st.emptyBtn}>
              {role === "buyer" ? "Tiếp tục mua sắm" : "Về trang chủ"}
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map((o) => {
              const oStatus = normalizeStatus(o?.status);
              const ss = statusStyle(oStatus);
              const items = o?.items || [];
              const first = items[0] || {};
              const totalItems = items.reduce((s, it) => s + Number(it.qty || 0), 0) || 0;
              const amount = computeAmount(o);

              // Logic hiển thị theo yêu cầu:
              // - Đơn to_ship có actions.allowCancel === true -> chỉ hiện HỦY
              // - Đơn to_ship có actions.allowReceive === true -> chỉ hiện ĐÃ NHẬN HÀNG
              const canCancel =
                role === "buyer" &&
                (["to_pay", "to_confirm"].includes(oStatus) ||
                  (oStatus === "to_ship" && o?.actions?.allowCancel === true));

              const canReceive =
                role === "buyer" &&
                oStatus === "to_ship" &&
                (o?.actions?.allowReceive === true || o?.actions?.allowReceive === undefined) &&
                o?.actions?.allowCancel !== true; // tránh trùng với case cancel

              return (
                <article key={o.id} style={st.card}>
                  {/* Header trong card */}
                  <div style={st.cardHead}>
                    <span style={st.orderId}>
                      Mã đơn: <b>{String(o.id).slice(-6) || o.id}</b>
                    </span>
                    <span
                      style={{
                        ...st.statusPill,
                        background: ss.bg,
                        color: ss.color,
                        boxShadow: `inset 0 0 0 1px ${ss.border}`,
                      }}
                    >
                      {(TABS.find((x) => x.key === oStatus)?.label) || "—"}
                    </span>
                  </div>

                  {/* Nội dung */}
                  <div style={st.row}>
                    <img
                      src={first.image || first.img || "/images/revibe-logo.png"}
                      alt={first.title || "Sản phẩm"}
                      style={st.thumb}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={st.cardTitle} title={first.title || "Sản phẩm"}>
                        {first.title || "Sản phẩm"}
                      </div>
                      <div style={st.meta}>
                        {totalItems > 1
                          ? `${totalItems} sản phẩm (hiển thị 1)`
                          : `Số lượng: ${Number(first.qty || 1)}`}
                      </div>
                      {first.price != null && (
                        <div style={st.meta}>Đơn giá: {fmtVND(Number(first.price || 0))}</div>
                      )}
                      {/* Đối tác: người mua khi role=seller, người bán khi role=buyer */}
                      {role === "seller" && o?.buyer?.name && (
                        <div style={{ ...st.meta, marginTop: 4 }}>
                          Khách hàng: <b style={{ color: "#0f172a" }}>{o.buyer.name}</b>
                        </div>
                      )}
                      {role === "buyer" && o?.seller?.name && (
                        <div style={{ ...st.meta, marginTop: 4 }}>
                          Người bán: <b style={{ color: "#0f172a" }}>{o.seller.name}</b>
                        </div>
                      )}
                    </div>
                    <div style={st.priceCol}>
                      <div style={st.amount}>{fmtVND(amount)}</div>
                    </div>
                  </div>

                  <div style={st.divider} />

                  {/* Footer actions */}
                  <div style={st.cardFoot}>
                    <div style={st.footHint}></div>

                    <div style={st.actionsRight}>
                      {canCancel && (
                        <button
                          style={st.cancelBtn}
                          onClick={() => cancelOrder(o.id)}
                          aria-label="Hủy đơn hàng"
                        >
                          Hủy đơn
                        </button>
                      )}

                      {canReceive && (
                        <button
                          style={st.receiveBtn}
                          onClick={() => markAsReceived(o.id)}
                          aria-label="Xác nhận đã nhận hàng"
                        >
                          Đã nhận hàng
                        </button>
                      )}

                      <button onClick={() => openDetail(o.id)} style={st.detailBtn}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================== styles ================== */
const st = {
  page: {
    maxWidth: 430,
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    color: "#0f172a",
    background: "#fff",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "28px 1fr 28px",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px 8px",
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 800 },

  /* Buyer / Seller switch */
  roleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "0 14px 8px",
  },
  roleBtn: {
    height: 38,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontWeight: 700,
    cursor: "pointer",
  },
  roleBtnActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    boxShadow: "0 8px 18px rgba(37,99,235,.16)",
  },

  /* Tabs */
  tabsWrap: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "max-content",
    gap: 10,
    padding: "0 14px 12px",
    overflowX: "auto",
  },
  tabBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#f3f4f6",
    color: "#0f172a",
    border: "1px solid transparent",
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  tabBtnActive: {
    border: "2px solid #2563eb",
    background: "#fff",
    boxShadow: "0 8px 18px rgba(37,99,235,.16)",
  },

  /* Card */
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f1f5f9",
    padding: 12,
    boxShadow: "0 10px 28px rgba(0,0,0,.08)",
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderId: { fontSize: 12.5, color: "#475569" },
  statusPill: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "92px 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 14,
    objectFit: "cover",
    background: "#f8fafc",
    boxShadow: "0 8px 18px rgba(0,0,0,.06)",
  },
  cardTitle: {
    fontWeight: 800,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: 14.5,
  },
  meta: { marginTop: 6, fontSize: 12.5, color: "#64748b" },
  priceCol: { textAlign: "right" },
  amount: { fontWeight: 900, fontSize: 18 },

  divider: { height: 1, background: "#eef2ff", margin: "10px 0 8px" },

  /* Footer (đẹp, không bẹp nút) */
  cardFoot: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 10,
  },
  footHint: {
    fontSize: 12.5,
    color: "#64748b",
    minWidth: 0,
    paddingRight: 8,
  },
  actionsRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "nowrap",
  },

  // nút xám viền đỏ "Hủy đơn"
  cancelBtn: {
    height: 40,
    padding: "0 16px",
    borderRadius: 999,
    border: "1px solid #fca5a5",
    background: "#fff",
    color: "#dc2626",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(220,38,38,.12)",
  },

  // nút đỏ "Đã nhận hàng"
  receiveBtn: {
    height: 40,
    padding: "0 16px",
    borderRadius: 999,
    border: "1px solid #fecaca",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(220,38,38,.22)",
  },

  // nút xanh "Xem chi tiết"
  detailBtn: {
    height: 40,
    padding: "0 16px",
    borderRadius: 999,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    boxShadow: "0 8px 18px rgba(37,99,235,.22)",
  },

  /* Empty */
  empty: {
    minHeight: "52vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    textAlign: "center",
  },
  emptyImg: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    objectFit: "cover",
    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
  },
  emptyTitle: { fontWeight: 800, color: "#0f172a" },
  emptyBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-block",
    marginTop: 6,
  },
};
