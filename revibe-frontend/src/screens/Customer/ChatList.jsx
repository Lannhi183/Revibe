import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { chatAPI } from "../../services/chatService";

/* ================= STYLES ================= */
const st = {
  root: {
    position: "fixed",
    left: 0, right: 0, top: 0, bottom: 0,
    width: "100%",
    height: "calc(var(--vh, 1dvh) * 100)",
    background: "white",
    display: "grid",
    gridTemplateRows: "80px 1fr",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  /* HEADER */
  header: {
    display: "grid",
    gridTemplateColumns: "50px 1fr auto",
    gap: 16,
    alignItems: "center",
    padding: "12px 20px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    zIndex: 3,
  },
  back: {
    width: 44, height: 44, borderRadius: 16,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", fontSize: 18, fontWeight: "bold",
    border: "none", display: "grid", placeItems: "center", 
    cursor: "pointer", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
    transition: "all 0.2s ease",
  },
  title: { 
    fontWeight: 700, fontSize: 24, color: "#1f2937", 
    display: "flex", alignItems: "center", gap: 8 
  },
  titleIcon: { fontSize: 28 },
  searchBtn: {
    width: 44, height: 44, borderRadius: 16,
    background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
    display: "grid", placeItems: "center", cursor: "pointer",
    fontSize: 18, border: "none",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },

  /* CHAT LIST */
  list: {
    overflowY: "auto",
    overflowX: "hidden", 
    padding: "16px 0",
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
  },

  /* CHAT ITEM */
  chatItem: {
    display: "grid",
    gridTemplateColumns: "60px 1fr auto",
    gap: 16,
    alignItems: "center",
    padding: "16px 20px",
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(20px)",
    margin: "0 16px 12px",
    borderRadius: 20,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  avatarWrap: {
    position: "relative",
    width: 56, height: 56,
  },
  avatar: {
    width: "100%", height: "100%", 
    borderRadius: "50%", objectFit: "cover",
    border: "3px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  onlineIndicator: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: "50%",
    background: "#10b981", border: "2px solid #fff",
    animation: "pulse 2s infinite",
  },
  verifiedBadge: {
    position: "absolute", top: -2, right: -2,
    width: 20, height: 20, borderRadius: "50%",
    background: "linear-gradient(135deg, #3396D3, #1d4ed8)",
    display: "grid", placeItems: "center",
    fontSize: 10, color: "#fff",
    border: "2px solid #fff",
    boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
  },
  content: {
    minWidth: 0, // Prevent overflow
  },
  name: {
    fontWeight: 700, fontSize: 16, color: "#1f2937",
    display: "flex", alignItems: "center", gap: 6,
    marginBottom: 4,
  },
  message: {
    color: "#6b7280", fontSize: 14, lineHeight: 1.4,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical", 
    WebkitLineClamp: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rightCol: {
    display: "flex", flexDirection: "column",
    alignItems: "flex-end", gap: 8,
    minWidth: 60,
  },
  timestamp: {
    fontSize: 12, color: "#9ca3af", fontWeight: 500,
  },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff", fontSize: 11, fontWeight: 700,
    display: "grid", placeItems: "center",
    padding: "0 6px",
    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
  },

  /* EMPTY STATE */
  empty: {
    display: "flex", flexDirection: "column", 
    alignItems: "center", justifyContent: "center",
    height: "60%", padding: 40, textAlign: "center",
  },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  emptyText: { 
    fontSize: 18, fontWeight: 600, color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14, color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 1.5,
  },
};

/* ================= COMPONENT ================= */
export default function ChatList() {
  const nav = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversations from API
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatAPI.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Không thể tải danh sách tin nhắn');
      // Could set fallback empty state here
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Set viewport height
  useEffect(() => {
    const setVH = () => {
      const h = (window.visualViewport?.height || window.innerHeight || 0) * 0.01;
      document.documentElement.style.setProperty("--vh", `${h}px`);
    };
    setVH();
    const vv = window.visualViewport;
    vv && vv.addEventListener("resize", setVH);
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    return () => {
      vv && vv.removeEventListener("resize", setVH);
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .chat-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        background: rgba(255, 255, 255, 0.95) !important;
      }
      .back-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4) !important;
      }
      .search-btn:hover {
        background: linear-gradient(135deg, #e5e7eb, #d1d5db) !important;
        transform: scale(1.05);
      }
      .chat-item {
        animation: slideUp 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.other_person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.last_message?.text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (conversation) => {
    nav(`/customer/chat?conversationId=${conversation._id}&userId=${conversation.other_person._id}`);
  };

  const handleSearchClick = () => {
    const query = prompt("Tìm kiếm cuộc trò chuyện:");
    if (query !== null) {
      setSearchQuery(query);
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;

    return date.toLocaleDateString('vi-VN');
  };

  // Loading state
  if (loading) {
    return (
      <div style={st.root}>
        <header style={st.header}>
          <button onClick={() => nav(-1)} style={st.back} className="back-btn">←</button>
          <div style={st.title}><span style={st.titleIcon}>💬</span>Tin nhắn</div>
        </header>
        <main style={{...st.list, justifyContent: 'center', alignItems: 'center'}}>
          <div>Đang tải...</div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={st.root}>
        <header style={st.header}>
          <button onClick={() => nav(-1)} style={st.back} className="back-btn">←</button>
          <div style={st.title}><span style={st.titleIcon}>💬</span>Tin nhắn</div>
        </header>
        <main style={{...st.list, justifyContent: 'center', alignItems: 'center'}}>
          <div style={{color: 'red', textAlign: 'center'}}>
            <div>❌ {error}</div>
            <button onClick={loadConversations} style={{marginTop: 16, padding: '8px 16px'}}>Thử lại</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={st.root}>
      {/* HEADER */}
      <header style={st.header}>
        <button
          aria-label="Back"
          onClick={() => nav(-1)}
          style={st.back}
          className="back-btn"
        >
          ←
        </button>
        <div style={st.title}>
          <span style={st.titleIcon}>💬</span>
          Tin nhắn
        </div>
        <button
          style={st.searchBtn}
          className="search-btn"
          onClick={handleSearchClick}
          title="Tìm kiếm"
        >
          🔍
        </button>
      </header>

      {/* CHAT LIST */}
      <main style={st.list}>
        {filteredConversations.length === 0 ? (
          <div style={st.empty}>
            <div style={st.emptyIcon}>💬</div>
            <div style={st.emptyText}>
              {searchQuery ? "Không tìm thấy cuộc trò chuyện" : "Chưa có tin nhắn"}
            </div>
            <div style={st.emptySubtext}>
              {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Bắt đầu trò chuyện với người bán để được hỗ trợ tốt nhất"}
            </div>
          </div>
        ) : (
          filteredConversations.map((conversation, index) => (
            <div
              key={conversation._id}
              style={{
                ...st.chatItem,
                animationDelay: `${index * 0.1}s`,
              }}
              className="chat-item"
              onClick={() => handleConversationClick(conversation)}
            >
              {/* AVATAR */}
              <div style={st.avatarWrap}>
                <img
                  src={conversation.other_person.avatar_url || '/images/default-avatar.png'}
                  alt={conversation.other_person.name}
                  style={st.avatar}
                />
                {/* You can add online status from user presence here */}
                {/* {conversation.other_person.online && <div style={st.onlineIndicator}></div>} */}
                {conversation.other_person.role === 'seller' && (
                  <div style={st.verifiedBadge}>✓</div>
                )}
              </div>

              {/* CONTENT */}
              <div style={st.content}>
                <div style={st.name}>
                  {conversation.other_person.name}
                  <span style={{fontSize: 12, color: '#6b7280', marginLeft: 4}}>
                    ({conversation.other_person.role})
                  </span>
                </div>
                <div style={st.message}>
                  {conversation.last_message?.text || "Chưa có tin nhắn"}
                </div>
                {conversation.listings && conversation.listings.length > 0 && (
                  <div style={{fontSize: 12, color: '#6b7280', marginTop: 2}}>
                    📦 {conversation.listings.length} sản phẩm
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div style={st.rightCol}>
                <div style={st.timestamp}>
                  {formatTimestamp(conversation.last_message?.at || conversation.updated_at)}
                </div>
                {conversation.unread_count > 0 && (
                  <div style={st.unreadBadge}>
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
