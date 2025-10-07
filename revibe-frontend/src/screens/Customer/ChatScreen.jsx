import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatAPI, initSocket, joinConversation, leaveConversation, sendMessage, markAsRead, startTyping, stopTyping, setupSocketListeners, getSocketStatus } from "../../services/chatService";

/* ================= STYLES ================= */
const st = {
  root: {
    position: "fixed",
    left: 0, right: 0, top: 0, bottom: 0,
    width: "100%",
    height: "calc(var(--vh, 1dvh) * 100)",
    background: "#F9F5F0",
    display: "grid",
    gridTemplateRows: "70px 1fr auto",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  /* HEADER */
  header: {
    display: "grid",
    gridTemplateColumns: "50px 50px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "10px 16px",
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
  avatar: { 
    width: 44, height: 44, borderRadius: "50%", objectFit: "cover",
    border: "3px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  title: { fontWeight: 700, fontSize: 18, color: "#1f2937", lineHeight: 1.2 },
  sub: { fontSize: 13, color: "#10b981", fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 4 },
  onlineIcon: {
    width: 8, height: 8, borderRadius: "50%", 
    background: "#10b981", animation: "pulse 2s infinite",
  },

  /* MESSAGES LIST */
  list: {
    overflowY: "auto",
    overflowX: "hidden",
    padding: "20px 16px",
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
  },
  day: { 
    textAlign: "center", color: "rgba(255, 255, 255, 0.8)", 
    fontSize: 13, margin: "10px 0 20px", fontWeight: 500,
    background: "rgba(255, 255, 255, 0.15)", 
    padding: "6px 16px", borderRadius: 12, display: "inline-block"
  },

  row: { display: "flex", marginBottom: 16, animation: "slideUp 0.3s ease" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubbleL: {
    maxWidth: "80%", padding: "14px 18px",
    background: "rgba(255, 255, 255, 0.95)", color: "#1f2937",
    borderRadius: "20px 20px 20px 8px",
    lineHeight: 1.5, 
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05)",
    wordBreak: "break-word", overflowWrap: "anywhere",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    fontSize: 15,
  },
  bubbleR: {
    maxWidth: "80%", padding: "14px 18px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", 
    color: "#ffffff",
    borderRadius: "20px 20px 8px 20px",
    lineHeight: 1.5, 
    boxShadow: "0 8px 25px rgba(99, 102, 241, 0.3), 0 2px 6px rgba(139, 92, 246, 0.2)",
    wordBreak: "break-word", overflowWrap: "anywhere",
    fontSize: 15, fontWeight: 500,
  },

  /* BOTTOM AREA (chips + input)  */
  bottom: {
    position: "sticky", bottom: 0, left: 0, right: 0,
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    paddingBottom: "env(safe-area-inset-bottom)",
    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
    zIndex: 4,
  },
  chips: {
    display: "flex", gap: 10, overflowX: "auto",
    padding: "16px 12px 8px", boxSizing: "border-box", maxWidth: "100%",
  },
  chip: {
    flex: "0 0 auto",
    background: "linear-gradient(135deg, #f472b6, #ec4899)",
    color: "#fff", border: "none", borderRadius: 20,
    padding: "10px 16px", fontWeight: 600, fontSize: 14,
    display: "inline-flex", alignItems: "center", gap: 8,
    boxShadow: "0 4px 15px rgba(244, 114, 182, 0.3)", 
    cursor: "pointer", transition: "all 0.2s ease",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  chipDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.8)",
    animation: "pulse 2s infinite",
  },

  inputWrap: { padding: "8px 16px 16px", boxSizing: "border-box" },
  inputBar: {
    display: "grid",
    gridTemplateColumns: "48px 1fr 48px 90px", 
    gap: 12, alignItems: "center",
    background: "rgba(255, 255, 255, 0.8)",
    borderRadius: 25, padding: "6px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 16,
    background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
    display: "grid", placeItems: "center", cursor: "pointer",
    fontSize: 18, border: "none",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  input: {
    height: 44, borderRadius: 20, border: "none",
    padding: "0 18px", fontSize: 15, outline: "none",
    background: "transparent", minWidth: 0,
    color: "#1f2937", fontWeight: 500,
    "::placeholder": { color: "#9ca3af" },
  },
  send: {
    width: 80, height: 44, borderRadius: 20,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", 
    color: "#fff", fontWeight: 700, fontSize: 14,
    border: "none", cursor: "pointer", whiteSpace: "nowrap",
    boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
    transition: "all 0.2s ease",
  },

  /* PRODUCT CARD (message) */
  card: {
    maxWidth: "85%", 
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20, padding: 16, 
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  tgrid: { display: "grid", gridTemplateColumns: "42px 42px 42px", gap: 8 },
  timg: { 
    width: 42, height: 42, objectFit: "cover", borderRadius: 12, 
    background: "#f1f5f9", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" 
  },
  crow: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 12 },
  ctitle: { fontWeight: 700, color: "#1f2937", fontSize: 16 },
  muted: { color: "#6b7280", fontSize: 13, fontWeight: 500 },
  var: { color: "#6b7280", fontSize: 13, marginTop: 6, fontWeight: 500 },
  priceRow: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 12 },
  price: { 
    fontWeight: 800, fontSize: 18, 
    color: "transparent",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
  },
  old: { textDecoration: "line-through", color: "#9ca3af", fontSize: 14 },
};

/* ================= COMPONENT ================= */
export default function ChatScreen() {
  const nav = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  // Get parameters from URL
  const conversationId = params.get("conversationId");
  const userId = params.get("userId");

  // State management
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const listRef = useRef(null);

  // Initialize socket and setup listeners
  useEffect(() => {
    initSocket();

    // Set up socket listeners with callback functions
    const cleanup = setupSocketListeners({
      onNewMessage: (message) => {
        const currentUserId = getCurrentUserId();
        console.log('Received new message:', message, 'current conv:', conversationId, 'current user:', currentUserId);

        // Check if message is for this conversation
        if (message.conversation_id === conversationId && message.sender_id._id !== currentUserId) {
          console.log('Adding message to UI');
          setMessages(prev => [...prev, message]);
        }
      },
      onUserTyping: (data) => {
        console.log('User typing:', data);
        if (data.conversation_id === conversationId && data.user_id !== getCurrentUserId()) {
          setTyping(true);
        }
      },
      onUserStoppedTyping: (data) => {
        console.log('User stopped typing:', data);
        if (data.conversation_id === conversationId && data.user_id !== getCurrentUserId()) {
          setTyping(false);
        }
      },
      onConversationUpdated: (conversationId) => {
        console.log('Conversation updated:', conversationId);
      }
    });

    return cleanup;
  }, [conversationId]);

  // Check socket connection status
  useEffect(() => {
    const checkSocketStatus = () => {
      const { connected } = getSocketStatus();
      setSocketConnected(connected);
    };

    const interval = setInterval(checkSocketStatus, 1000);
    checkSocketStatus();

    return () => clearInterval(interval);
  }, []);

  // Load conversation and messages on mount
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else if (userId) {
      // If no conversation ID but we have user ID, we need to start a conversation
      startNewConversation(userId);
    } else {
      setError('Thiếu thông tin cuộc trò chuyện');
      setLoading(false);
    }
  }, [conversationId, userId]);

  // Load conversation details
  const loadConversation = async (convId) => {
    try {
      setError(null);
      // Load conversation details and messages
      const [convData, messagesData] = await Promise.all([
        // For now, load from conversations list - you might want a dedicated endpoint
        chatAPI.getConversations().then(convs => convs.find(c => c._id === convId)),
        chatAPI.getMessages(convId)
      ]);

      if (convData) {
        setConversation(convData);
      }
      setMessages(messagesData);

      // Join conversation room for real-time updates
      if (convId && socketConnected) {
        joinConversation(convId);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Không thể tải cuộc trò chuyện');
    } finally {
      setLoading(false);
    }
  };

  // Start new conversation if none exists
  const startNewConversation = async (targetUserId) => {
    try {
      setError(null);
      const result = await chatAPI.startConversation([getCurrentUserId(), targetUserId]);

      if (result && result._id) {
        // Redirect to the new conversation
        const newUrl = `/customer/chat?conversationId=${result._id}&userId=${targetUserId}`;
        nav(newUrl, { replace: true });
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Không thể bắt đầu cuộc trò chuyện');
      setLoading(false);
    }
  };

  // Get current user ID from auth
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

  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .chat-input:focus {
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
      }
      .send-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
      }
      .chip-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(244, 114, 182, 0.4) !important;
      }
      .back-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4) !important;
      }
      .icon-btn:hover {
        background: linear-gradient(135deg, #e5e7eb, #d1d5db) !important;
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Join conversation room when connected
  useEffect(() => {
    if (conversationId && socketConnected) {
      joinConversation(conversationId);
    }
  }, [conversationId, socketConnected, joinConversation]);

  // Leave conversation on unmount
  useEffect(() => {
    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, leaveConversation]);

  // Mark as read when conversation is viewed
  useEffect(() => {
    if (conversationId && conversation) {
      // Mark conversation as read after a short delay to ensure UI is ready
      const timer = setTimeout(() => {
        markAsRead(conversationId);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversationId, conversation, markAsRead]);

  // Send message handler
  const handleSend = async () => {
    if (!text.trim() || sending || !conversationId) return;

    const messageText = text.trim();
    setText("");
    setSending(true);

    try {
      await chatAPI.sendMessage(conversationId, messageText);

      // Optimistically add message to UI
      const newMessage = {
        _id: `temp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: { _id: getCurrentUserId() },
        text: messageText,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Không thể gửi tin nhắn');
      setText(messageText); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (newText) => {
    setText(newText);

    // Send typing indicator if connected
    if (conversationId && socketConnected && newText.trim()) {
      startTyping(conversationId);
    }
  };

  // Handle input blur to stop typing
  const handleInputBlur = () => {
    if (conversationId && socketConnected) {
      stopTyping(conversationId);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick message handler
  const handleQuickMessage = async (quickText) => {
    if (!conversationId) return;

    try {
      await chatAPI.sendMessage(conversationId, quickText);

      // Add to UI
      const newMessage = {
        _id: `temp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: { _id: getCurrentUserId() },
        text: quickText,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Failed to send quick message:', err);
      setError('Không thể gửi tin nhắn');
    }
  };

  const quickReplies = [
    { id: "q1", text: "Còn hàng không?" },
    { id: "q2", text: "Giá ship bao nhiêu?" },
    { id: "q3", text: "Cho xem thêm hình" },
  ];

  // Loading state
  if (loading) {
    return (
      <div style={st.root}>
        <header style={st.header}>
          <button onClick={() => nav(-1)} style={st.back} className="back-btn">←</button>
          <div style={st.title}>Đang tải...</div>
        </header>
        <main style={{...st.list, justifyContent: 'center', alignItems: 'center'}}>
          <div>Đang tải cuộc trò chuyện...</div>
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
          <div style={st.title}>Lỗi</div>
        </header>
        <main style={{...st.list, justifyContent: 'center', alignItems: 'center'}}>
          <div style={{color: 'red', textAlign: 'center'}}>
            <div>❌ {error}</div>
            <button onClick={() => nav('/customer/messages')} style={{marginTop: 16, padding: '8px 16px'}}>
              Quay lại
            </button>
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
        <img
          src={conversation?.other_person?.avatar_url || '/images/default-avatar.png'}
          alt={conversation?.other_person?.name || 'User'}
          style={st.avatar}
        />
        <div>
          <div style={st.title}>
            {conversation?.other_person?.name || 'Người dùng'}
          </div>
          <div style={st.sub}>
            <div style={st.onlineIcon}></div>
            {typing ? "Đang nhập..." : "Trực tuyến"}
          </div>
        </div>
      </header>

      {/* MESSAGES LIST */}
      <main ref={listRef} style={st.list}>
        <div style={{ textAlign: 'center', marginBottom: 20, color:'#666' }}>
          <span>Hôm nay</span>
        </div>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id._id === getCurrentUserId();

            return (
              <div
                key={message._id || message.id}
                style={{ ...st.row, ...(isCurrentUser ? st.right : st.left) }}
              >
                <div style={isCurrentUser ? st.bubbleR : st.bubbleL}>
                  {message.text}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* BOTTOM: chips + input */}
      <div style={st.bottom}>
        <div style={st.chips}>
          {quickReplies.map((q) => (
            <button
              key={q.id}
              style={st.chip}
              className="chip-btn"
              onClick={() => handleQuickMessage(q.text)}
              disabled={!conversationId || sending}
            >
              <span style={st.chipDot}></span>{q.text}
            </button>
          ))}
        </div>

        <div style={st.inputWrap}>
          <div style={st.inputBar}>
            <button style={st.iconBtn} className="icon-btn" title="Emoji">😊</button>
            <input
              style={st.input}
              className="chat-input"
              placeholder="Nhập tin nhắn..."
              value={text}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyPress}
              disabled={!conversationId || sending}
            />
            <button style={st.iconBtn} className="icon-btn" title="Đính kèm">📎</button>
            <button
              style={st.send}
              className="send-btn"
              onClick={handleSend}
              disabled={!text.trim() || sending || !conversationId}
            >
              {sending ? '...' : 'Gửi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== Sub ============== */
function ProductCard({ title, price, old, color, size, qty, thumbs = [] }) {
  return (
    <div style={st.card}>
      <div style={st.tgrid}>
        {thumbs.slice(0, 3).map((t, i) => <img key={i} src={t} alt="thumb" style={st.timg} />)}
      </div>
      <div style={st.crow}>
        <div style={st.ctitle}>{title || "Sản phẩm"}</div>
        <div style={st.muted}>{qty ? `${qty} item${qty > 1 ? "s" : ""}` : ""}</div>
      </div>
      {(color || size) && (
        <div style={st.var}>
          {color ? `Màu: ${color}` : ""}{color && size ? " · " : ""}{size ? `Size: ${size}` : ""}
        </div>
      )}
      <div style={st.priceRow}>
        <div style={st.price}>${Number(price || 0).toFixed(2)}</div>
        {old ? <div style={st.old}>${Number(old).toFixed(2)}</div> : null}
      </div>
    </div>
  );
}
