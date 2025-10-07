# 📱 Chat Routing Setup

## 🗺️ **Cấu trúc routing đã được cập nhật:**

### 🔗 **Routes chính:**

1. **`/messages`** - Trong CustomerLayout (có BottomTab)
   - Component: `MessagesRedirect`
   - Tự động redirect đến `/customer/messages`

2. **`/customer/messages`** - Full-screen (không có BottomTab)
   - Component: `ChatList`
   - Hiển thị danh sách cuộc trò chuyện

3. **`/customer/chat?sellerId=xxx`** - Full-screen (không có BottomTab)
   - Component: `ChatScreen`
   - Hiển thị chat với seller cụ thể

### 📋 **Luồng navigation:**

```
BottomTab "Tin nhắn" 
    ↓
/messages (MessagesRedirect)
    ↓
/customer/messages (ChatList)
    ↓ Click vào chat
/customer/chat?sellerId=s1 (ChatScreen)
```

### 🎯 **Các tính năng:**

✅ **BottomTab** có tab "Tin nhắn" với icon 💬
✅ **ChatList** full-screen với danh sách 6 người bán
✅ **ChatScreen** full-screen với UI chat hiện đại
✅ **Auto-redirect** từ layout route đến full-screen
✅ **Back navigation** hoạt động đúng giữa các screen

### 🔧 **Files đã được cập nhật:**

1. `src/app/routes.jsx` - Thêm routing cho chat
2. `src/components/BottomTab.jsx` - Đổi Thông báo → Tin nhắn
3. `src/screens/Customer/ChatList.jsx` - Component mới
4. `src/screens/Customer/MessagesRedirect.jsx` - Helper redirect
5. `src/screens/Customer/ChatScreen.jsx` - Đã có sẵn

### 🚀 **Sử dụng:**

Người dùng có thể:
- Nhấn tab "Tin nhắn" ở BottomTab
- Xem danh sách chat với hiệu ứng đẹp
- Click vào chat để mở ChatScreen
- Quay lại với nút back