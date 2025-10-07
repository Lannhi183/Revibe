// src/screens/Customer/FAQ.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function FAQ() {
  const nav = useNavigate();
  const { hash } = useLocation();

  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  // mở câu hỏi theo #hash (ví dụ /faq#acc-payment-2)
  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      setOpenId(id);
      // scroll mượt đến phần được link
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    }
  }, [hash]);

  const flat = useMemo(() => {
    // tạo mảng phẳng để search nhanh
    const arr = [];
    DATA.forEach((group) => {
      group.items.forEach((qa) => arr.push({ ...qa, section: group.title }));
    });
    return arr;
  }, []);

  const normalized = (s) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const results = useMemo(() => {
    const q = normalized(query);
    if (!q) return null; // không search -> dùng view theo nhóm
    return flat.filter(
      (i) =>
        normalized(i.q).includes(q) ||
        normalized(i.a).includes(q) ||
        normalized(i.section).includes(q)
    );
  }, [query, flat]);

  // highlight từ khóa trong đoạn text
  const highlight = (text) => {
    if (!query) return text;
    const q = normalized(query);
    const raw = text;
    const lower = normalized(text);
    const parts = [];
    let i = 0;
    while (true) {
      const idx = lower.indexOf(q, i);
      if (idx === -1) {
        parts.push(raw.slice(i));
        break;
      }
      parts.push(raw.slice(i, idx));
      parts.push(<mark key={idx} style={st.mark}>{raw.slice(idx, idx + q.length)}</mark>);
      i = idx + q.length;
    }
    return <>{parts}</>;
  };

  return (
    <div style={st.page}>
      <div style={st.wrap}>
        {/* Header cố định trên cùng */}
        <header style={st.header}>
          <button onClick={() => nav(-1)} style={st.iconBtn} aria-label="Quay lại">←</button>
          <h1 style={st.h1}>FAQ & Hướng dẫn</h1>
          <div style={{ width: 28 }} />
        </header>

        {/* Thanh tìm kiếm */}
        <div style={st.searchBar}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm câu hỏi, ví dụ: thanh toán, đổi trả…"
            style={st.input}
          />
          {query ? (
            <button style={st.clear} onClick={() => setQuery("")} aria-label="Xóa">✕</button>
          ) : (
            <span style={st.hint}>⌘K</span>
          )}
        </div>

        {/* Nếu đang search -> hiển thị kết quả phẳng; ngược lại -> theo nhóm */}
        {results ? (
          <section style={st.section}>
            <div style={st.secHead}>
              <div style={st.secTitle}>Kết quả tìm kiếm</div>
              <div style={st.secSub}>{results.length} kết quả</div>
            </div>

            {results.length === 0 ? (
              <div style={st.empty}>
                Không tìm thấy. Thử từ khóa khác hoặc duyệt danh mục bên dưới.
              </div>
            ) : (
              <ul style={st.list}>
                {results.map((item) => (
                  <li key={item.id} id={item.id} style={st.item}>
                    <button
                      style={st.q}
                      onClick={() => setOpenId((o) => (o === item.id ? null : item.id))}
                      aria-expanded={openId === item.id}
                    >
                      <span style={st.badge}>{item.section}</span>
                      <span>{highlight(item.q)}</span>
                      <span style={st.chev}>{openId === item.id ? "–" : "+"}</span>
                    </button>
                    <div
                      style={{
                        ...st.aWrap,
                        ...(openId === item.id ? st.aOpen : st.aClosed),
                      }}
                    >
                      <div style={st.a}>{highlight(item.a)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            {/* Mục lục theo nhóm */}
            <nav style={st.toc}>
              {DATA.map((g) => (
                <a key={g.slug} href={`#${g.slug}`} style={st.tocLink}>
                  {g.icon} {g.title}
                </a>
              ))}
            </nav>

            {/* Các nhóm Q&A */}
            {DATA.map((group) => (
              <section key={group.slug} id={group.slug} style={st.section}>
                <div style={st.secHead}>
                  <div style={st.secTitle}>{group.title}</div>
                  <div style={st.secSub}>{group.items.length} mục</div>
                </div>

                <ul style={st.list}>
                  {group.items.map((qa) => (
                    <li key={qa.id} id={qa.id} style={st.item}>
                      <button
                        style={st.q}
                        onClick={() => setOpenId((o) => (o === qa.id ? null : qa.id))}
                        aria-expanded={openId === qa.id}
                      >
                        <span>{qa.q}</span>
                        <span style={st.chev}>{openId === qa.id ? "–" : "+"}</span>
                      </button>
                      <div
                        style={{
                          ...st.aWrap,
                          ...(openId === qa.id ? st.aOpen : st.aClosed),
                        }}
                      >
                        <div style={st.a}>{qa.a}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {/* Liên hệ thêm */}
            <section style={st.helpCard}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Cần thêm trợ giúp?</div>
              <div style={{ color: "#475569", marginTop: 6 }}>
                Không tìm thấy câu trả lời phù hợp? Liên hệ đội hỗ trợ của chúng tôi.
              </div>
              <div style={st.helpRow}>
                <a href="mailto:support@example.com" style={st.helpBtn}>📧 Email</a>
                <a href="tel:+84123456789" style={st.helpBtn}>📞 Gọi</a>
                <button style={st.helpBtn}>💬 Chat</button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Mock data ---------------- */
const DATA = [
  {
    slug: "account",
    title: "Tài khoản",
    icon: "👤",
    items: [
      {
        id: "acc-1",
        q: "Quên mật khẩu thì làm sao?",
        a: "Vào Đăng nhập → Quên mật khẩu → nhập email để nhận liên kết đặt lại. Liên kết có hiệu lực trong 15 phút.",
      },
      {
        id: "acc-2",
        q: "Đổi email đăng nhập được không?",
        a: "Bạn có thể đổi email trong Trang cá nhân → Thiết lập → Bảo mật. Hệ thống sẽ gửi mã xác thực đến email mới.",
      },
    ],
  },
  {
    slug: "payment",
    title: "Thanh toán",
    icon: "💳",
    items: [
      {
        id: "pay-1",
        q: "Những phương thức thanh toán được hỗ trợ?",
        a: "Chúng tôi hỗ trợ thẻ tín dụng/ghi nợ (Visa/Mastercard), ví điện tử nội địa, và COD ở một số khu vực.",
      },
      {
        id: "pay-2",
        q: "Thanh toán thất bại nhưng đã trừ tiền?",
        a: "Đôi khi ngân hàng tạm giữ tiền trong vài phút. Nếu quá 2 giờ chưa hoàn lại, vui lòng liên hệ hỗ trợ kèm mã giao dịch.",
      },
    ],
  },
  {
    slug: "shipping",
    title: "Vận chuyển",
    icon: "📦",
    items: [
      {
        id: "ship-1",
        q: "Phí vận chuyển tính như thế nào?",
        a: "Phí phụ thuộc địa chỉ nhận và khối lượng. Ở màn xác nhận đơn, bạn sẽ thấy phí cụ thể trước khi thanh toán.",
      },
      {
        id: "ship-2",
        q: "Thời gian giao hàng?",
        a: "Nội thành: 1–2 ngày; Liên tỉnh: 3–5 ngày làm việc. Với hàng pre-order, thời gian có thể lâu hơn.",
      },
    ],
  },
  {
    slug: "return",
    title: "Đổi trả & Bảo hành",
    icon: "♻️",
    items: [
      {
        id: "ret-1",
        q: "Chính sách đổi trả như thế nào?",
        a: "Đổi/trả trong vòng 7 ngày kể từ khi nhận. Sản phẩm chưa qua sử dụng, còn tag/hộp. Một số mặt hàng không áp dụng (đồ lót…).",
      },
      {
        id: "ret-2",
        q: "Bảo hành sản phẩm ra sao?",
        a: "Tùy nhóm hàng sẽ có thời hạn bảo hành khác nhau (3–12 tháng). Xem chi tiết trong trang sản phẩm hoặc hỏi người bán.",
      },
    ],
  },
];

/* ---------------- Styles ---------------- */
const st = {
  // lấp đầy viewport, cho phép scroll, chừa safe-area + khoảng BottomTab
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

  header: {
    display: "grid",
    gridTemplateColumns: "28px 1fr 28px",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  },
  h1: { margin: 0, fontSize: 20, fontWeight: 800 },

  searchBar: {
    position: "relative",
    height: 36,
    borderRadius: 12,
    background: "#fff",
    border: "1px solid #e5e7eb",
    display: "grid",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 44,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    color: "#0f172a",
  },
  clear: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  },
  hint: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 12,
    color: "#64748b",
  },

  toc: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    margin: "4px 0 12px",
  },
  tocLink: {
    display: "block",
    textDecoration: "none",
    color: "#1d4ed8",
    background: "#eef2ff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 700,
  },

  section: { marginBottom: 12 },
  secHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  secTitle: { fontSize: 16, fontWeight: 800 },
  secSub: { fontSize: 12, color: "#64748b" },

  list: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 },
  item: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  },
  q: {
    width: "100%",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "12px",
    background: "#fff",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
  },
  chev: { opacity: 0.6, fontWeight: 900 },

  aWrap: {
    transition: "grid-template-rows .25s ease, opacity .2s ease",
    display: "grid",
    gridTemplateRows: "0fr",
    opacity: 0,
    padding: "0 12px",
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
  },
  aOpen: { gridTemplateRows: "1fr", opacity: 1, padding: "0 12px 12px" },
  aClosed: {},
  a: {
    overflow: "hidden",
    fontSize: 13.5,
    lineHeight: 1.45,
    color: "#334155",
    paddingTop: 10,
  },

  badge: {
    fontSize: 10,
    fontWeight: 800,
    color: "#1d4ed8",
    background: "#eef2ff",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "3px 6px",
    marginRight: 8,
  },

  helpCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  helpRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  helpBtn: {
    textDecoration: "none",
    color: "#0f172a",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  mark: {
    background: "#fef08a",
    color: "inherit",
    padding: "0 2px",
    borderRadius: 4,
  },
};
