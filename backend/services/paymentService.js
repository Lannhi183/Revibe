import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Shipment } from '../models/Shipment.js';

// Mock VietQR config - cần thay thế bằng config thật
const VIETQR_CONFIG = {
  bankId: process.env.VIETQR_BANK_ID || "970436",
  accountNo: process.env.VIETQR_ACCOUNT_NO || "1031720754",
  accountName: process.env.VIETQR_ACCOUNT_NAME || "NGUYEN THI LAN NHI",
  template: process.env.VIETQR_TEMPLATE || "compact2",
};

export async function createPaymentForOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Try to find existing payment (latest)
  let existingPayment = await Payment.findOne({ order_id: orderId }).sort({ created_at: -1 });

  // helper to build vietqr url + payload
  const buildPayload = (orderId, amount) => {
    const transactionId = `REV${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
    const transferContent = `REVIBE${String(orderId).substr(-6)}`;
    const vietQrUrl = `https://img.vietqr.io/image/${VIETQR_CONFIG.bankId}-${VIETQR_CONFIG.accountNo}-${VIETQR_CONFIG.template}.png?amount=${amount}&addInfo=${transferContent}&accountName=${encodeURIComponent(VIETQR_CONFIG.accountName)}`;
    return { transaction_id: transactionId, transfer_content: transferContent, qr_url: vietQrUrl };
  };

  const amount = order.amounts?.total ?? 0;

  if (existingPayment && existingPayment.status === "pending") {
    // regenerate qr and update existing pending payment
    const payload = buildPayload(orderId, amount);
    existingPayment.provider_payload = { ...(existingPayment.provider_payload || {}), ...payload };
    existingPayment.amount = amount;
    existingPayment.currency = order.currency || "VND";
    existingPayment.updated_at = new Date();
    await existingPayment.save();
    return existingPayment;
  }

  // create new pending payment (either none existed or previous payment not pending)
  const provider_payload = buildPayload(orderId, amount);

  const payment = await Payment.create({
    order_id: order._id,
    method: "online",
    provider: "vietqr",
    amount,
    currency: order.currency || "VND",
    status: "pending",
    provider_payload,
  });

  return payment;
}

export async function confirmPayment(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  // Kiểm tra trạng thái hợp lệ
  if (order.payment_status !== 'pending') {
    throw new Error('Invalid payment status transition');
  }

  // Cập nhật payment status
  const payment = await Payment.findOneAndUpdate(
    { order_id: orderId },
    { status: 'paid' },
    { new: true }
  );

  // Cập nhật order status
  order.payment_status = "paid";
  order.order_status = "processing";
  order.history = order.history || [];
  order.history.push({
    at: new Date(),
    action: "payment_paid",
    from: "payment_pending",
    to: "payment_paid",
    note: payment ? `payment:${payment._id}` : undefined,
  });
  await order.save();

  // Tạo shipment
  const shipment = await Shipment.create({
    order_id: order._id,
    status: 'pending',
    address_to: order.shipping_address,
    events: [{
      at: new Date(),
      code: 'order_confirmed',
      note: 'Order has been confirmed and is being processed'
    }]
  });

  return {
    order,
    payment,
    shipment
  };
}

export async function handlePaymentWebhook(payload = {}, signature) {
  // basic signature verification using secret
  const secret = process.env.VIETQR_WEBHOOK_SECRET;
  if (secret) {
    const sigHeader = signature || "";
    if (sigHeader !== secret) {
      throw new Error("Invalid webhook signature");
    }
  }

  const { orderId, transactionId, amount, status } = payload;
  if (!orderId || !transactionId) throw new Error("Invalid webhook payload");

  const payment = await Payment.findOne({
    order_id: orderId,
    "provider_payload.transaction_id": transactionId,
  });

  if (!payment) throw new Error("Payment record not found for webhook");

  if (Number(payment.amount) !== Number(amount)) {
    throw new Error("Amount mismatch");
  }

  // only treat status value 'success' or 'paid' as completed
  const normalized = (status || "").toString().toLowerCase();
  if (normalized === "success" || normalized === "paid") {
    return confirmPayment(orderId);
  }

  // handle other statuses if needed
  await Payment.findByIdAndUpdate(payment._id, { status: "failed" });
  return { ok: false, reason: "unhandled status", status: normalized };
}

export async function handleWebhookEndpoint(req, res) {
  try {
    const signature = req.headers["x-vietqr-signature"] || req.headers["x-webhook-signature"];
    const result = await handlePaymentWebhook(req.body, signature);
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("Webhook handler error:", err.message || err);
    res.status(400).json({ error: err.message || "webhook error" });
  }
}