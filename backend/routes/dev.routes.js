import { Router } from "express";

// MODELS
import { User } from "../models/User.js";
import { SellerProfile } from "../models/SellerProfile.js";
import { Address } from "../models/Address.js";
import { Category } from "../models/Category.js";
import { Badge } from "../models/Badge.js";
import { UserBadge } from "../models/UserBadge.js";
import { ContentPage } from "../models/ContentPage.js";
import { PlatformConfig } from "../models/PlatformConfig.js";
import { Listing } from "../models/Listing.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Shipment } from "../models/Shipment.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { Review } from "../models/Review.js";
import { Notification } from "../models/Notification.js";
import { Report } from "../models/Report.js";

const r = Router();

/** Helpers */
const upsertOne = async (Model, where, doc) =>
  Model.findOneAndUpdate(where, { $setOnInsert: doc }, { new: true, upsert: true });

/** 1) Tạo user nhanh */
r.post("/users", async (req, res) => {
  const { email, role = "user", name = "", phone = "" } = req.body;
  const u = await upsertOne(User, { email }, { email, role, name, phone, email_verified: true });
  return res.json(u);
});

/** 2) Categories (tạo nhiều) */
r.post("/categories", async (req, res) => {
  const items = req.body.categories || [];
  const ops = await Category.insertMany(items, { ordered: false });
  res.json(ops);
});

/** 3) Badges + gán badge */
r.post("/badges", async (req, res) => {
  const items = req.body.badges || [];
  const ops = await Badge.insertMany(items, { ordered: false });
  res.json(ops);
});
r.post("/user-badges", async (req, res) => {
  const doc = await upsertOne(
    UserBadge,
    { user_id: req.body.user_id, badge_code: req.body.badge_code },
    { user_id: req.body.user_id, badge_code: req.body.badge_code, granted_by: req.body.granted_by, at: new Date() }
  );
  res.json(doc);
});

/** 4) Content pages + platform config */
r.post("/content", async (req, res) => {
  const pages = (req.body.pages || []).map(p => ({ ...p, published_at: p.published ? new Date() : undefined }));
  const ops = await ContentPage.insertMany(pages, { ordered: false });
  res.json(ops);
});
r.post("/platform-config", async (req, res) => {
  const doc = await upsertOne(PlatformConfig, {}, req.body);
  res.json(doc);
});

/** 5) Listings nhanh */
r.post("/listings", async (req, res) => {
  const doc = await Listing.create({ ...req.body, status: req.body.status || "active" });
  res.json(doc);
});

/** 6) Cart → Checkout nhanh (tạo order + payment + shipment demo) */
r.post("/checkout", async (req, res) => {
  const { buyer_id, items = [], address, payment_method = "online", seller_id } = req.body;
  if (!buyer_id || !items.length) return res.status(400).json({ error: "buyer_id & items required" });

  // save cart (optional, để bạn thấy trên DB)
  await upsertOne(Cart, { buyer_id }, { buyer_id, items });

  const subtotal = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const shipping = 25000; const fee = 5000; const discount = 0; const total = subtotal + shipping + fee - discount;

  const order = await Order.create({
    buyer_id, seller_id: seller_id || items[0].seller_id,
    order_status: payment_method === "cod" ? "processing" : "pending",
    payment_status: payment_method === "cod" ? "pending" : "pending",
    shipping_status: "pending",
    items: items.map(i => ({ listing_id: i.listing_id, title: i.title, image: i.image, qty: i.qty || 1, price: i.price })),
    amounts: { subtotal, shipping, fee, discount, total },
    currency: "VND",
    shipping_address: address,
    payment_method
  });

  const payment = await Payment.create({
    order_id: order._id, method: payment_method,
    provider: payment_method === "online" ? "manual_vietqr" : "cod",
    amount: total, currency: "VND", status: payment_method === "cod" ? "pending" : "pending",
    provider_payload: payment_method === "online" ? { qr_url: "https://example.com/qr/demo" } : undefined
  });

  await Shipment.create({ order_id: order._id, carrier: "GHN", tracking_no: "DEMO001", status: "pending", events: [] });

  res.json({ order, payment });
});

/** 7) Chat & message nhanh */
r.post("/chat/start", async (req, res) => {
  const { buyer_id, seller_id, listing_id } = req.body;
  let conv = await Conversation.findOne({ buyer_id, seller_id, listing_id });
  if (!conv) conv = await Conversation.create({ buyer_id, seller_id, listing_id, last_message: null, unread: { buyer: 0, seller: 0 } });
  res.json(conv);
});
r.post("/chat/send", async (req, res) => {
  const { conversation_id, sender_id, text } = req.body;
  const msg = await Message.create({ conversation_id, sender_id, text });
  await Conversation.findByIdAndUpdate(conversation_id, { last_message: { text, at: new Date() } });
  res.json(msg);
});

/** 8) Review & report demo */
r.post("/reviews", async (req, res) => { res.json(await Review.create(req.body)); });
r.post("/reports", async (req, res) => { res.json(await Report.create(req.body)); });

/** 9) Seed-all (1 phát có đủ dữ liệu chính) */
r.post("/seed-all", async (_req, res) => {
  // Import hash function
  const { hashPassword } = await import('../utils/hash.js');
  const testPassword = await hashPassword('123456'); // Default test password
  
  // Users
  const admin  = await upsertOne(User, { email: "admin@revibe.vn" },  { 
    email: "admin@revibe.vn", 
    role: "admin", 
    name: "Admin", 
    email_verified: true,
    password_hash: testPassword 
  });
  const seller = await upsertOne(User, { email: "seller@revibe.vn" }, { 
    email: "seller@revibe.vn", 
    role: "user",  
    name: "Mai Anh", 
    phone: "0900000001",
    email_verified: true,
    password_hash: testPassword
  });
  const buyer  = await upsertOne(User, { email: "buyer@revibe.vn"  }, { 
    email: "buyer@revibe.vn",  
    role: "user",  
    name: "Hà Vy",  
    phone: "0900000002",
    email_verified: true,
    password_hash: testPassword
  });

  await upsertOne(SellerProfile, { user_id: seller._id }, { user_id: seller._id, shop_name: "Mai Anh Vintage", kyc_status: "verified" });
  await upsertOne(Address, { user_id: buyer._id, label: "Nhà" }, { user_id: buyer._id, label: "Nhà", full_name: "Hà Vy", phone: "0900000002", line1: "123 Lê Lợi", ward: "Hải Châu 1", district: "Hải Châu", city: "Đà Nẵng", is_default: true });

  const [catWomen] = await Category.find({ slug: "thoi-trang-nu" });
  if (!catWomen) await Category.insertMany([
    { slug: "thoi-trang-nu", name: "Thời trang nữ", path: [] },
    { slug: "ao-thun", name: "Áo thun", path: ["thoi-trang-nu"], attributes: [{ key: "size", type: "enum", values: ["S","M","L","XL"] }, { key: "condition", type: "enum", values: ["new","like-new","good","fair"] }] },
    { slug: "quan-jeans", name: "Quần jeans", path: ["thoi-trang-nu"], attributes: [{ key: "size", type: "enum", values: ["26","27","28","29","30"] }] }
  ]);

  await upsertOne(PlatformConfig, {}, { fees: { commission_pct: 7, min_fee: 0 }, payments: { providers: ["manual_vietqr"], online_min: 10000 }, flags: { require_listing_review: true } });
  await Badge.updateOne({ code: "trusted" }, { $setOnInsert: { code: "trusted", name: "Người bán uy tín" } }, { upsert: true });
  await upsertOne(UserBadge, { user_id: seller._id, badge_code: "trusted" }, { user_id: seller._id, badge_code: "trusted", granted_by: admin._id, at: new Date() });
  await ContentPage.updateOne({ slug: "terms", version: 1 }, { $setOnInsert: { slug: "terms", version: 1, title: "Điều khoản", content_md: "# Điều khoản sử dụng", published: true, published_at: new Date() } }, { upsert: true });

  const teeCat = await Category.findOne({ slug: "ao-thun" });
  const jeansCat = await Category.findOne({ slug: "quan-jeans" });

  const l1 = await Listing.create({ seller_id: seller._id, category_id: teeCat?._id, title: "Áo thun vintage form rộng", price: 120000, images: ["https://picsum.photos/seed/tee1/800/800"], attributes: { size: "L", condition: "like-new" }, status: "active" });
  const l2 = await Listing.create({ seller_id: seller._id, category_id: jeansCat?._id, title: "Quần jeans xanh", price: 250000, images: ["https://picsum.photos/seed/jeans1/800/800"], attributes: { size: "29", condition: "good" }, status: "active" });

  const order = await Order.create({
    buyer_id: buyer._id, seller_id: seller._id,
    order_status: "processing", payment_status: "paid", shipping_status: "in_transit",
    items: [{ listing_id: l1._id, title: l1.title, image: l1.images[0], qty: 1, price: l1.price }],
    amounts: { subtotal: 120000, shipping: 25000, fee: 5000, discount: 0, total: 150000 },
    currency: "VND", payment_method: "online",
    shipping_address: { full_name: "Hà Vy", phone: "0900000002", city: "Đà Nẵng", line1: "123 Lê Lợi" }
  });
  await Payment.create({ order_id: order._id, method: "online", provider: "manual_vietqr", amount: 150000, currency: "VND", status: "paid" });
  await Shipment.create({ order_id: order._id, carrier: "GHN", tracking_no: "GHN001", status: "in_transit" });

  const conv = await Conversation.create({ buyer_id: buyer._id, seller_id: seller._id, listing_id: l1._id, last_message: { text: "Thanks!", at: new Date() }, unread: { buyer: 0, seller: 0 } });
  await Message.insertMany([{ conversation_id: conv._id, sender_id: buyer._id, text: "Chị ơi còn hàng không?" }, { conversation_id: conv._id, sender_id: seller._id, text: "Còn em nhé!" }]);

  await Review.create({ order_id: order._id, target_user_id: seller._id, author_user_id: buyer._id, rating: 5, comment: "Hàng đẹp như hình" });
  await Notification.create({ user_id: buyer._id, type: "order_status", title: "Đơn đang vận chuyển", payload: { order_id: order._id }, read: false });
  await Report.create({ target_type: "product", target_id: l2._id, reporter_id: buyer._id, reason: "Mô tả chưa rõ", status: "open" });

  res.json({ admin, seller, buyer, l1, l2, order, conv });
});

export default r;
