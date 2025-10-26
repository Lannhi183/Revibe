# Seed Orders Script

Script này tạo mock data cho orders với đầy đủ các trạng thái để test UI.

## Order Flow (Quy trình đơn hàng)

### SELLER Actions:
1. **PENDING** → Click "Xác nhận" → **PROCESSING**
2. **PROCESSING** → Click "Đã giao vận chuyển" → **SHIPPED**
3. **SHIPPED** → Click "Đã giao hàng" → **DELIVERED**

### BUYER Actions:
1. **PENDING** hoặc **PROCESSING** → Click "Hủy đơn" → **CANCELED**
2. **DELIVERED** → Click "Đã nhận hàng" → **COMPLETED**
3. **DELIVERED** → Click "Chưa nhận được" → **CANCELED**

## Mock Orders Created

Script sẽ tạo 7 đơn hàng mẫu:

1. **PENDING** (Online) - Buyer có thể hủy, Seller có thể xác nhận
2. **PENDING** (COD) - Test phương thức COD
3. **PROCESSING** - Seller có thể đánh dấu đã giao vận chuyển
4. **SHIPPED** - Seller có thể đánh dấu đã giao hàng
5. **DELIVERED** - Buyer có thể xác nhận nhận hàng hoặc báo không nhận được
6. **COMPLETED** - Ví dụ đơn hoàn thành
7. **CANCELED** - Ví dụ đơn đã hủy

## Cách chạy

### 1. Đảm bảo có MongoDB kết nối

Kiểm tra file `.env` có `MONGODB_URI`:
```env
MONGODB_URI=mongodb+srv://Lnhi:songu183204@cluster0.t5uojn3.mongodb.net/revibe
```

### 2. Đảm bảo có ít nhất 2 users trong database

Nếu chưa có users, chạy seed users trước (hoặc đăng ký qua UI).

### 3. Chạy script

```bash
cd backend
node scripts/seed_orders.js
```

### 4. Kiểm tra output

Script sẽ hiển thị:
- ✅ Connected to MongoDB
- 👤 Buyer và Seller ID
- 📝 Danh sách 7 orders đã tạo
- 🎯 Tóm tắt order flow

## API Endpoints được sử dụng

### Seller Endpoints:
- `POST /api/v1/orders/:id/status` - Xác nhận đơn (pending → processing)
- `POST /api/v1/orders/:id/ship` - Đánh dấu đã giao vận chuyển (processing → shipped)
- `POST /api/v1/orders/:id/deliver` - Đánh dấu đã giao hàng (shipped → delivered)

### Buyer Endpoints:
- `POST /api/v1/orders/:id/cancel` - Hủy đơn (pending/processing → canceled)
- `POST /api/v1/orders/:id/receive` - Xác nhận nhận hàng (delivered → completed)
- `POST /api/v1/orders/:id/report-not-received` - Báo không nhận được hàng (delivered → canceled)

## UI Testing

Sau khi seed xong:

1. Login với tài khoản Buyer → vào `/orders?role=buyer`
2. Login với tài khoản Seller → vào `/orders?role=seller`
3. Test các buttons theo từng trạng thái

## Troubleshooting

### Lỗi: "Need at least 2 users in database"
- Tạo users trước bằng cách đăng ký qua UI hoặc chạy seed users script

### Lỗi: "Connected failed"
- Kiểm tra MONGODB_URI trong .env
- Kiểm tra kết nối internet (nếu dùng MongoDB Atlas)

### Orders không hiển thị trong UI
- Kiểm tra token đã login chưa
- Xem console log có lỗi gì không
- Kiểm tra buyerId/sellerId trong localStorage có khớp với orders không

## Notes

- Script không xóa orders cũ (comment out dòng `Order.deleteMany` nếu muốn giữ orders cũ)
- Mỗi lần chạy sẽ thêm 7 orders mới
- Orders có timestamp khác nhau để dễ test sorting
