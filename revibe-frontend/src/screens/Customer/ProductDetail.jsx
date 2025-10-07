import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { getAuthHeaders } from "../../utils/auth.js";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api/v1";

// ✨ format tiền Việt (backend trả VND)
const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

/* ------------ SCREEN ------------ */
export default function ProductDetail() {
  const { id: routeId } = useParams();
  const nav = useNavigate();

  // ==== SAFE AREA & LAYOUT MEASURE ====
  const [btSafe, setBtSafe] = useState(92);
  const headerRef = useRef(null);
  const [cardH, setCardH] = useState(420);

  const getViewportHeight = () => {
    if (window.visualViewport?.height) return Math.round(window.visualViewport.height);
    return Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  };
  useEffect(() => {
    const applyVHVar = () => {
      const vh = getViewportHeight();
      document.documentElement.style.setProperty("--vh", `${vh * 0.01}px`);
    };
    applyVHVar();
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", applyVHVar);
    window.addEventListener("resize", applyVHVar);
    window.addEventListener("orientationchange", applyVHVar);
    return () => {
      if (vv) vv.removeEventListener("resize", applyVHVar);
      window.removeEventListener("resize", applyVHVar);
      window.removeEventListener("orientationchange", applyVHVar);
    };
  }, []);

  useEffect(() => {
    const onTabH = (e) => {
      const h = Number(e?.detail?.height);
      if (!Number.isNaN(h) && h > 0 && h < 360) setBtSafe(h);
    };
    window.addEventListener("revibe:tabHeight", onTabH);
    return () => window.removeEventListener("revibe:tabHeight", onTabH);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const recalcHeights = () => {
    const vh = getViewportHeight();
    const hh = headerRef.current?.getBoundingClientRect().height || 0;
    const controlsH = 84; // chiều cao cụm controls (64 + padding)
    const marginFix = 6;
    const h = Math.max(320, vh - (btSafe + hh + controlsH + marginFix));
    setCardH(h);
  };
  useEffect(() => {
    recalcHeights();
    const onR = () => recalcHeights();
    window.addEventListener("resize", onR);
    window.addEventListener("orientationchange", onR);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", onR);
    const to = setTimeout(onR, 50);
    return () => {
      clearTimeout(to);
      window.removeEventListener("resize", onR);
      window.removeEventListener("orientationchange", onR);
      if (vv) vv.removeEventListener("resize", onR);
    };
  }, [btSafe]);

  // ==== DATA (API ONLY) ====
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const buildHeaders = () => getAuthHeaders();

  const makeArray = (v) => {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string")
      return v.split(/[,;\/]+/).map((s) => s.trim()).filter(Boolean);
    return [v];
  };

  const normalizeListing = (doc) => {
    const imgs = Array.isArray(doc.images) && doc.images.length
      ? doc.images
      : (doc.image ? [doc.image] : (doc.image_url ? [doc.image_url] : []));
    const at = doc.attributes || {};

    // sellerId: luôn là ObjectId của USER (không phải sellerProfile)
    const sellerIdFromDoc =
      typeof doc.seller_id === "string" || typeof doc.seller_id === "number"
        ? String(doc.seller_id)
        : (doc.seller_id?._id || doc.seller_id?.id || doc.sellerId || null);

    return {
      id: doc._id || doc.id,
      title: doc.title || doc.name || doc.label || "—",
      price: Number(doc.price ?? doc.amount ?? 0),
      currency: doc.currency || "VND",
      images: imgs,
      desc: doc.description || doc.desc || doc.summary || "",
      colors: makeArray(at.color || doc.colors || []),
      sizes: makeArray(at.size || doc.sizes || []),
      specs: {
        Brand: at.brand || doc.brand || "",
        Condition: at.condition || doc.condition || "",
        Tags: Array.isArray(at.style_tags) ? at.style_tags : makeArray(at.style_tags || []),
        ...(doc.specs || {}),
      },
      metrics: doc.metrics || { views: 0, likes: 0 },
      location: doc.location || "",
      sellerId: sellerIdFromDoc,
      seller:
        (doc.seller && typeof doc.seller === "object") ? doc.seller :
        (doc.seller_id && typeof doc.seller_id === "object" && !Array.isArray(doc.seller_id) ? doc.seller_id : null),
      raw: doc,
    };
  };

  useEffect(() => {
    let mounted = true;
    const fetchList = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_BASE}/listings`, {
          headers: buildHeaders(),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const arr = (body.data ?? body ?? []).map(normalizeListing).filter(Boolean);
        if (!mounted) return;
        setListings(arr);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        mounted && setLoading(false);
      }
    };
    fetchList();
    return () => { mounted = false; };
  }, []);

  // focus theo :id nếu có
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!routeId || listings.length === 0) return;
    const i = listings.findIndex((x) => String(x.id) === String(routeId));
    if (i >= 0) setIdx(i);
  }, [routeId, listings]);

  const p = useMemo(
    () => (listings.length ? listings[idx % listings.length] : null),
    [listings, idx]
  );

  // ========= FETCH SELLER (map ObjectId user) =========
  const [seller, setSeller] = useState(null);

  const normalizeSeller = (raw, fallbackUserId) => {
    if (!raw) return null;

    // cố gắng bóc user object nếu có
    const userObj = raw.user || raw.user_id || null;

    const id =
      (typeof raw === "string" ? raw : null) ||
      (userObj && (userObj._id || userObj.id)) ||
      raw._id || raw.id || fallbackUserId || null;

    // Ưu tiên tên hiển thị:
    const name =
      raw.shop_name ||                       // SellerProfile
      (userObj && (userObj.name || userObj.displayName)) ||
      raw.name || raw.displayName || "Seller";

    // Avatar lấy từ user nếu có
    const avatar =
      raw.avatar || raw.photo ||
      (userObj && (userObj.avatar || userObj.photo)) || null;

    const verified =
      (raw.kyc_status ? raw.kyc_status === "verified" : false) ||
      !!raw.verified || !!raw.isVerified ||
      !!(userObj && (userObj.verified || userObj.isVerified));

    const rating =
      typeof raw.rating_avg === "number" ? raw.rating_avg :
      (typeof raw.rating === "number" ? raw.rating : undefined);

    const reviews =
      typeof raw.rating_count === "number" ? raw.rating_count :
      (typeof raw.reviews === "number" ? raw.reviews : undefined);

    const location = raw.location || (userObj && userObj.location) || raw.city || "";

    return {
      id: String(id || ""),
      name,
      avatar,
      verified,
      rating,
      reviews,
      location,
    };
  };

  useEffect(() => {
    console.log('ProductDetail - p:', p);
    console.log('ProductDetail - p.sellerId:', p?.sellerId);

    setSeller(p?.seller ? normalizeSeller(p.seller, p.sellerId) : null);
    if (!p || p.seller) return;

    const sellerUserId = p?.sellerId; // ObjectId string (User)
    if (!sellerUserId) return;

    const controller = new AbortController();

    const fetchSeller = async (sid) => {
      console.log('fetchSeller - sid:', sid);
      try {
        // 1) ưu tiên seller profile theo user_id
        let res = await fetch(`${API_BASE}/seller-profiles/by-user/${sid}`, {
          headers: buildHeaders(),
          signal: controller.signal,
          cache: "no-store",
        });
        console.log('fetchSeller - seller profile response:', res.ok);
        if (res.ok) {
          const body = await res.json();
          console.log('fetchSeller - seller profile body:', body);
          const doc = body.data ?? body ?? null;
          if (doc) {
            const normalized = normalizeSeller(doc, sid);
            console.log('fetchSeller - normalized seller:', normalized);
            setSeller(normalized);
            return;
          }
        }

        // 2) ?user_id=
        res = await fetch(`${API_BASE}/seller-profiles?user_id=${encodeURIComponent(sid)}`, {
          headers: buildHeaders(),
          signal: controller.signal,
          cache: "no-store",
        });
        console.log('fetchSeller - seller profiles response:', res.ok);
        if (res.ok) {
          const body = await res.json();
          console.log('fetchSeller - seller profiles body:', body);
          const arr = body.data ?? body ?? [];
          if (Array.isArray(arr) && arr.length) {
            const normalized = normalizeSeller(arr[0], sid);
            console.log('fetchSeller - normalized seller from list:', normalized);
            setSeller(normalized);
            return;
          }
        }

        // 3) fallback lấy user
        res = await fetch(`${API_BASE}/users/${sid}`, {
          headers: buildHeaders(),
          signal: controller.signal,
          cache: "no-store",
        });
        console.log('fetchSeller - user response:', res.ok);
        if (res.ok) {
          const body = await res.json();
          console.log('fetchSeller - user body:', body);
          const doc = body.data ?? body ?? null;
          if (doc) {
            const normalized = normalizeSeller(doc, sid);
            console.log('fetchSeller - normalized user:', normalized);
            setSeller(normalized);
          }
        }
      } catch (e) {
        console.log('fetchSeller error:', e);
      }
    };

    fetchSeller(sellerUserId);
    return () => controller.abort();
  }, [p]);

  // ===== gestures
  const cardRef = useRef(null);
  const start = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false });
  const [sheetOpen, setSheetOpen] = useState(true); // Start with sheet open for mobile
  const [sheetMode, setSheetMode] = useState("peek"); // 'peek' | 'full'

  const onStart = (x, y) => { start.current = { x, y }; setDrag({ dx: 0, dy: 0, active: true }); };
  const onMove = (x, y) => {
    if (!drag.active) return;
    setDrag((d) => ({ ...d, dx: x - start.current.x, dy: y - start.current.y }));
  };
  const resetDrag = () => setDrag({ dx: 0, dy: 0, active: false });

  const onEnd = async () => {
    const { dx, dy } = drag;
    const X = 80; const Y = 30;
    if (!sheetOpen && dy < -Y) { setSheetOpen(true); setSheetMode("peek"); resetDrag(); return; }
    if (!sheetOpen && Math.abs(dx) >= X) {
      if (dx > 0) { // swipe phải -> add cart
        await addToCart();
        animateOut(1);
      } else {      // swipe trái -> pass
        animateOut(-1);
      }
      return;
    }
    resetDrag();
  };

  const animateOut = (dir) => {
    const el = cardRef.current; if (!el) return;
    el.style.transition = "transform 220ms ease, opacity 220ms ease";
    el.style.transform = `translate(${dir * 420}px, 0) rotate(${dir * 10}deg)`;
    el.style.opacity = "0.25";
    setTimeout(() => {
      el.style.transition = "none";
      el.style.transform = "translate(0,0)";
      el.style.opacity = "1";
      resetDrag();
      if (listings.length > 0) setIdx((i) => (i + 1) % listings.length);
      recalcHeights();
    }, 220);
  };

  // sheet gestures
  const sheetStart = useRef(0);
  const [sheetDy, setSheetDy] = useState(0);
  const onSheetStart = (y) => { sheetStart.current = y; setSheetDy(0); };
  const onSheetMove = (y) => {
    const dy = y - sheetStart.current;
    if (dy < -90 && sheetOpen && sheetMode !== "full") { setSheetMode("full"); setSheetDy(0); return; }
    if (dy > 90 && sheetOpen && sheetMode === "full") { setSheetMode("peek"); setSheetDy(0); return; }
    if (sheetMode === "peek") setSheetDy(Math.max(0, dy));
  };
  const onSheetEnd = () => {
    if (sheetMode === "peek") {
      if (sheetDy > 80) setSheetOpen(false);
      setSheetDy(0);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("revibe:tab", { detail: { hidden: sheetOpen } }));
  }, [sheetOpen]);

  useEffect(() => { setSheetOpen(false); setSheetMode("peek"); resetDrag(); recalcHeights(); }, [idx]);

  // ===== variant & qty
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  useEffect(() => { setColorIdx(0); setSizeIdx(0); setQty(1); }, [idx]);

  // ===== Cart / Checkout helpers
  const CHECKOUT_INTENT_KEY = "revibe.checkout.intent";

  const currentVariant = () => ({
    id: p?.id,
    title: p?.title,
    price: p?.price,
    priceVND: p?.price,
    image: p?.images?.[0] || null,
    color: p?.colors?.[colorIdx] || null,
    size: p?.sizes?.[sizeIdx] || null,
    qty,
    sellerId: p?.sellerId || seller?.id || null,
  });

  // ======= TOAST state
  const [toast, setToast] = useState({ show: false, text: "" });
  const showToast = (text, ms = 1400) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: "" }), ms);
  };

  const addToCart = async () => {
    const v = currentVariant();
    if (!v?.id) return;
    try {
      const res = await fetch(`${API_BASE}/cart/add`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          item: {
            listing_id: v.id,
            seller_id: v.sellerId || null,
            title: v.title,
            image: v.image || null,
            qty: v.qty || 1,
            price: v.priceVND || v.price || 0,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && body.error) || `HTTP ${res.status}`);
      }
      showToast("Đã thêm vào giỏ hàng");
    } catch (err) {
      showToast(String(err.message || err));
    }
  };

  const buyNow = () => {
    const v = currentVariant();
    if (!v?.id) return;
    const intent = {
      from: "product_detail",
      createdAt: Date.now(),
      items: [v],
      totalVND: (v.priceVND || v.price || 0) * (v.qty || 1),
    };
    localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
    nav("/checkout");
  };

  const getCurrentUserId = () => {
    const authData = localStorage.getItem('revibe_auth');
    if (authData) {
      try {
        const { user } = JSON.parse(authData);
        return user?.sub || user?.id;
      } catch (e) {}
    }
    return null;
  };

  // Check if chat is available for debugging
  const canChat = () => {
    const v = currentVariant();
    const sid = v.sellerId || p?.sellerId || seller?.id;
    const currentUserId = getCurrentUserId();
    return p?.id && currentUserId && sid && currentUserId !== sid; // Don't allow chatting with yourself
  };

  const onChatSeller = async () => {
    if (!canChat()) return;

    const v = currentVariant();
    const sid = v.sellerId || p?.sellerId || seller?.id;

    const currentUserId = getCurrentUserId();

    try {
      // Import chatService here since it's not imported at the top
      const { chatAPI } = await import('../../services/chatService');

      // Start conversation with current product listing ID
      const conversation = await chatAPI.startConversation([currentUserId, sid], [p.id], 'buyer');

      if (conversation && conversation._id) {
        // Navigate to the created conversation
        nav(`/customer/chat?conversationId=${conversation._id}`);
        showToast('Đã tạo cuộc hội thoại!');
        console.log('Created conversation with listing:', p.id);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      showToast('Không thể tạo cuộc hội thoại');
    }
  };

  const cardTransform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx * 0.05}deg)`;
  const isFull = sheetOpen && sheetMode === "full";
  const CSS_SAFE = `calc(${btSafe}px + env(safe-area-inset-bottom))`;

  // -------- Render guards
  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Đang tải sản phẩm...</div>;
  if (err) return <div style={{ textAlign: "center", padding: 40 }}>Lỗi: {err}</div>;
  if (!p) return <div style={{ textAlign: "center", padding: 40 }}>Không có sản phẩm.</div>;

  return (
    <div style={{ ...st.page, ["--bt-safe"]: CSS_SAFE }}>
      <header ref={headerRef} style={st.topbar}>
        <button onClick={() => nav(-1)} style={st.iconBtn} aria-label="Back">←</button>
        <div />
        <div />
      </header>

      {/* Ảnh lớn (pass UI) */}
      <div
        ref={cardRef}
        style={{ ...st.card, height: `${cardH}px`, transform: cardTransform, pointerEvents: sheetOpen ? "none" : "auto" }}
        onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => e.button === 0 && onStart(e.clientX, e.clientY)}
        onMouseMove={(e) => drag.active && onMove(e.clientX, e.clientY)}
        onMouseUp={onEnd}
        onMouseLeave={drag.active ? onEnd : undefined}
        onClick={() => !sheetOpen && (setSheetOpen(true), setSheetMode("peek"))}
      >
        <div
          style={{
            ...st.photo,
            backgroundImage: `url(${p.images?.[0] || ""})`,
            filter: sheetOpen ? "blur(10px) brightness(0.9)" : "none",
            transform: sheetOpen ? "scale(1.03)" : "none",
            transition: "filter .22s ease, transform .22s ease",
          }}
        />
        {sheetOpen && <div style={st.dim} />}
        {!sheetOpen && (
          <div
            onClick={() => { setSheetOpen(true); setSheetMode("peek"); }}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, cursor: "ns-resize" }}
          />
        )}
      </div>

      {/* Cụm nút + dots (fixed trên bottom tab) */}
      <div
        style={{
          ...st.controls,
          opacity: sheetOpen ? 0 : 1,
          pointerEvents: sheetOpen ? "none" : "auto",
        }}
      >
        <button onClick={() => animateOut(-1)} style={{ ...st.circle, background: "#ef4444" }} aria-label="Dislike">✖</button>
        <div style={st.dots}>
          {listings.map((_, i) => (
            <span
              key={i}
              style={{ ...st.dot, ...(i === (idx % listings.length) ? st.dotActive : {}) }}
            />
          ))}
        </div>
        <button onClick={async () => { await addToCart(); animateOut(1); }} style={{ ...st.circle, background: "#22c55e" }} aria-label="Thêm vào giỏ">❤</button>
      </div>

      {/* Backdrop (Portal) */}
      {sheetOpen &&
        createPortal(
          <div style={st.backdrop} onClick={() => setSheetOpen(false)} onTouchMove={(e) => e.preventDefault()} aria-hidden />,
          document.body
        )}

      {/* BottomSheet (Portal) */}
      {createPortal(
        <section
          style={{
            ...st.sheet,
            ...(isFull ? st.sheetFull : st.sheetPeek),
            transform: !sheetOpen ? `translateY(110%)` : isFull ? `translateY(0)` : `translateY(${sheetDy}px)`,
          }}
          onTouchStart={(e) => onSheetStart(e.touches[0].clientY)}
          onTouchMove={(e) => onSheetMove(e.touches[0].clientY)}
          onTouchEnd={onSheetEnd}
          onMouseDown={(e) => onSheetStart(e.clientY)}
          onMouseMove={(e) => sheetDy > 0 && onSheetMove(e.clientY)}
          onMouseUp={onSheetEnd}
          onMouseLeave={sheetDy > 0 ? onSheetEnd : undefined}
        >
          <div style={st.handle} />

          <div style={{ ...(isFull ? st.sheetInnerFull : st.sheetInner) }}>
            {/* Header price + tags */}
            <div style={st.sheetHeader}>
              <div style={{ ...st.thumb, backgroundImage: `url(${p.images?.[0] || ""})` }} />
              <div>
                <div style={st.priceRow}>
                  <b style={st.price}>{fmtVND(p.price)}</b>
                </div>
                <div style={st.tags}>
                  {p.colors?.[0] && <span style={st.tag}>{p.colors[0]}</span>}
                  {p.sizes?.[0] && <span style={st.tag}>{p.sizes[0]}</span>}
                </div>
              </div>
            </div>

            {/* Options */}
            {!!p.colors?.length && (
              <>
                <h4 style={st.h4}>Tùy chọn màu</h4>
                <div style={st.colorRow}>
                  {p.colors.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => setColorIdx(i)}
                      style={{ ...st.colorItem, ...(colorIdx === i ? st.colorActive : {}) }}
                    >
                      <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", fontWeight: 700 }}>{c}</div>
                      {colorIdx === i && <span style={st.tick}>✔</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {!!p.sizes?.length && (
              <>
                <h4 style={st.h4}>Kích cỡ</h4>
                <div style={st.sizeRow}>
                  {p.sizes.map((sz, i) => (
                    <button
                      key={`${sz}-${i}`}
                      onClick={() => setSizeIdx(i)}
                      style={{ ...st.sizeItem, ...(sizeIdx === i ? st.sizeActive : {}) }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </>
            )}

            <h4 style={st.h4}>Số lượng</h4>
            <div style={st.qtyRow}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={st.stepBtn}>−</button>
              <div style={st.qtyBox}>{qty}</div>
              <button onClick={() => setQty((q) => q + 1)} style={st.stepBtn}>＋</button>
            </div>

            <div style={st.ctaRow}>
              <button style={st.wishBtn} aria-label="Wishlist">♡</button>
              <button style={st.addBtn} onClick={addToCart}>Thêm vào giỏ</button>
              <button style={st.buyBtn} onClick={buyNow}>Mua ngay</button>
            </div>

            {/* ===== Seller Card — ĐẶT Ở DƯỚI CÁC CTA, trước description ===== */}
            {(seller || p.sellerId) && (
              <>
                <div style={{ height: 10 }} />
                <div style={st.sellerCard}>
                  <div style={st.sellerLeft}>
                    {seller?.avatar ? (
                      <img src={seller.avatar} alt={seller?.name || "seller"} style={st.sellerAvatar} />
                    ) : (
                      <div style={{ ...st.sellerAvatar, background: "#f1f5f9", display: "grid", placeItems: "center", fontWeight: 700 }}>
                        {(seller?.name || "S").slice(0,1)}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={st.sellerNameRow}>
                        {/* ✅ TÊN TỪ DATABASE */}
                        <span style={st.sellerName}>{seller?.name || "Seller"}</span>
                        {seller?.verified && <span style={st.badge}>Verified</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "#475569", flexWrap: "wrap" }}>
                        {typeof seller?.rating === "number" && (
                          <span title="Đánh giá">
                            {"★".repeat(Math.floor(seller.rating))}
                            <span style={{ marginLeft: 6, opacity: 0.8, fontWeight: 600 }}>
                              {Number(seller.rating).toFixed(1)}/5
                            </span>
                            {typeof seller?.reviews === "number" && <span style={{ marginLeft: 6, opacity: 0.7 }}>({seller.reviews})</span>}
                          </span>
                        )}
                        {seller?.location && (<><span style={{ opacity: 0.45 }}>•</span><span>{seller.location}</span></>)}
                      </div>
                    </div>
                  </div>

                  <button
                    style={{...st.chatBtn, opacity: canChat() ? 1 : 0.5}}
                    onClick={onChatSeller}
                    aria-label="Chat với seller"
                    disabled={!canChat()}
                  >
                    💬 Chat
                  </button>
                </div>
              </>
            )}

            {isFull && (
              <>
                <div style={{ height: 14 }} />
                {!!p.desc && <p style={st.desc}>{p.desc}</p>}

                <h4 style={st.h4Big}>Specifications</h4>
                <div style={st.kv}>
                  {p.specs?.Brand ? (
                    <div style={st.kvRow}><span style={st.kvLabel}>Brand</span><span className="kvv">{p.specs.Brand}</span></div>
                  ) : null}
                  {p.specs?.Condition ? (
                    <div style={st.kvRow}><span style={st.kvLabel}>Condition</span><span className="kvv">{p.specs.Condition}</span></div>
                  ) : null}
                  {!!p.specs?.Tags?.length && (
                    <div style={st.kvRow}>
                      <span style={st.kvLabel}>Tags</span>
                      <div style={st.chips}>{p.specs.Tags.map((m, i) => (<span key={i} style={st.chip}>{m}</span>))}</div>
                    </div>
                  )}
                  {p.location ? (
                    <div style={st.kvRow}><span style={st.kvLabel}>Location</span><span className="kvv">{p.location}</span></div>
                  ) : null}
                </div>

                {!!p.raw?.reviews?.length && (
                  <>
                    <h4 style={st.h4Big}>Rating & Reviews</h4>
                    {p.raw.reviews.slice(0, 1).map((rv, i) => (
                      <div key={i} style={st.reviewCard}>
                        <div style={st.revHead}>
                          {rv.avatar && <img alt="avatar" src={rv.avatar} style={st.revAvatar} />}
                          <div>
                            <div style={{ fontWeight: 700 }}>{rv.name || "User"}</div>
                            <div>{"★".repeat(Math.max(0, Math.min(5, Math.round(rv.rating || 0))))}</div>
                          </div>
                        </div>
                        <p style={st.revText}>{rv.text}</p>
                      </div>
                    ))}
                    <button style={st.allReviewsBtn}>View All Reviews</button>
                  </>
                )}
              </>
            )}

            <div style={{ height: 12 }} />
          </div>
        </section>,
        document.body
      )}

      {/* ✅ Toast (Portal) */}
      {createPortal(
        toast.show ? (
          <div style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: `calc(${btSafe}px + 64px + env(safe-area-inset-bottom))`,
            background: "#111827",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            boxShadow: "0 10px 24px rgba(0,0,0,.25)",
            fontWeight: 700,
            zIndex: 2147483647
          }}>
             {toast.text}
          </div>
        ) : null,
        document.body
      )}
    </div>
  );
}

/* ------------ STYLES (UI gốc, fit + controls fixed) ------------ */
const st = {
  page: {
    width: "min(430px,100%)",
    margin: "0 auto",
    height: "calc(var(--vh, 1dvh) * 100)",
    background: "#ffffff",
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    // chừa chỗ cho controls + bottomTab + safe-area
    paddingBottom: "calc(var(--bt-safe) + env(safe-area-inset-bottom) + 84px)",
  },
  topbar: { display: "grid", gridTemplateColumns: "28px 1fr 28px", alignItems: "center", padding: "10px 12px" },
  iconBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" },

  card: { position: "relative", zIndex: 2, margin: "6px 14px 0", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,.12)", transformOrigin: "50% 80%", touchAction: "none" },
  photo: { width: "100%", height: "100%", backgroundSize: "cover", backgroundPosition: "center" },
  dim: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.12))", pointerEvents: "none" },

  // Controls cố định ngay trên bottom tab
  controls: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(var(--bt-safe) + env(safe-area-inset-bottom))",
    width: "min(430px, 100%)",
    zIndex: 2147483646,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    padding: "12px 22px 8px",
    pointerEvents: "auto",
    transition: "opacity .18s ease",
  },
  circle: { width: 64, height: 64, borderRadius: "50%", color: "#fff", fontSize: 26, border: "none", boxShadow: "0 12px 22px rgba(0,0,0,.16)", cursor: "pointer" },
  dots: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 999, background: "#cbd5e1" },
  dotActive: { width: 22, background: "#2563eb" },

  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.12)", backdropFilter: "blur(1px)", zIndex: 2147483646, transition: "opacity .2s ease", touchAction: "none" },

  sheet: { position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: "min(430px, 100%)", margin: "0 auto", background: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: "0 -10px 30px rgba(0,0,0,.18)", transition: "transform .26s cubic-bezier(.2,.7,.2,1)", zIndex: 2147483647, willChange: "transform", padding: "8px 0 calc(12px + env(safe-area-inset-bottom))", boxSizing: "border-box" },
  sheetPeek: {},
  sheetFull: {},
  sheetInner: { padding: "0 12px 12px", boxSizing: "border-box", maxHeight: "calc(100dvh - 140px)", overflowY: "auto", overscrollBehavior: "contain" },
  sheetInnerFull: { padding: "0 12px 16px", boxSizing: "border-box", maxHeight: "calc(100dvh - 70px)", overflowY: "auto", overscrollBehavior: "contain" },
  handle: { width: 44, height: 5, borderRadius: 999, background: "#e5e7eb", margin: "6px auto 10px" },

  sheetHeader: { display: "grid", gridTemplateColumns: "56px 1fr", gap: 10, alignItems: "center", marginBottom: 8 },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundSize: "cover", backgroundPosition: "center" },

  priceRow: { display: "flex", gap: 8, alignItems: "baseline" },
  price: { fontSize: 20 },

  tags: { display: "flex", gap: 6, marginTop: 6 },
  tag: { background: "#eef2ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600 },

  h4: { margin: "12px 2px 8px", fontSize: 14 },
  h4Big: { margin: "16px 2px 10px", fontSize: 16, fontWeight: 700 },

  colorRow: { display: "grid", gridAutoFlow: "column", gridAutoColumns: "64px", gap: 10, overflowX: "auto", paddingBottom: 4 },
  colorItem: { position: "relative", width: 64, height: 64, borderRadius: 12, border: "2px solid transparent", overflow: "hidden", background: "#f3f4f6", padding: 0 },
  colorActive: { borderColor: "#2563eb" },
  tick: { position: "absolute", left: 6, bottom: 6, background: "#2563eb", color: "#fff", width: 18, height: 18, borderRadius: "50%", fontSize: 12, display: "grid", placeItems: "center" },

  sizeRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  sizeItem: { height: 36, minWidth: 44, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" },
  sizeActive: { borderColor: "#2563eb", boxShadow: "0 2px 8px rgba(37,99,235,.2)" },

  qtyRow: { display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 12, alignItems: "center" },
  stepBtn: { height: 40, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontSize: 20, cursor: "pointer" },
  qtyBox: { height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#eef2ff", color: "#1d4ed8", fontWeight: 700 },

  ctaRow: { display: "grid", gridTemplateColumns: "54px 1fr 1fr", gap: 10, marginTop: 12 },
  wishBtn: { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, fontSize: 20, cursor: "pointer" },
  addBtn: { background: "#0f172a", color: "#fff", border: "none", borderRadius: 12, height: 44, fontWeight: 700, cursor: "pointer" },
  buyBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, height: 44, fontWeight: 700 },

  // Seller card
  sellerCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 10, border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,.05)", background: "#fff", overflow: "hidden" },
  sellerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  sellerAvatar: { width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },

  sellerNameRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2, minWidth: 0, flexWrap: "wrap" },
  sellerName: { fontWeight: 700 },
  badge: { background: "#e6ffed", color: "#15803d", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 },

  chatBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, height: 36, fontWeight: 700, cursor: "pointer", padding: "0 12px", whiteSpace: "nowrap", flexShrink: 0, maxWidth: "140px" },

  desc: { lineHeight: 1.5, color: "#0f172a", opacity: 0.9 },
  kv: { display: "grid", gap: 10 },
  kvRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  kvLabel: { fontWeight: 600, color: "#0f172a" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { background: "#eef2ff", color: "#1d4ed8", padding: "6px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600 },

  starRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 18 },
  reviewCard: { marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, boxShadow: "0 4px 10px rgba(0,0,0,.05)" },
  revHead: { display: "flex", gap: 10, alignItems: "center", marginBottom: 6 },
  revAvatar: { width: 36, height: 36, objectFit: "cover", borderRadius: "50%" },
  revText: { fontSize: 13.5, lineHeight: 1.45, color: "#334155" },
  allReviewsBtn: { marginTop: 12, width: "100%", height: 44, borderRadius: 12, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700 },
};
