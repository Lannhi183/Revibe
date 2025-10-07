import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ok } from "../utils/response.js";
import { createOrderFromCart } from "../services/orderService.js";
import { createPaymentForOrder, confirmPayment,  handleWebhookEndpoint} from "../services/paymentService.js";
import { requireAuth } from "../middlewares/auth.js";
import { Order } from "../models/Order.js";
import { coerceToObjectId } from "../utils/idCoerce.js";
import { simulatePaymentWebhook } from "../services/webhookService.js";
// Chỉ enable trong môi trường development
if (process.env.NODE_ENV === 'development') {
  const r = Router();
  r.post(
    "/:id/simulate-payment",
    requireAuth,
    asyncHandler(async (req, res) => {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      await simulatePaymentWebhook(order._id, order.amounts.total);
      ok(res, { message: "Payment webhook simulated" });
    })
  );
}

const r = Router();

const checkoutSchema = z.object({
  params: z.object({ buyerId: z.string().min(1) }),
  body: z.object({
    payment_method: z.enum(["online", "cod"]),
    items: z.array(z.string()).optional(),
    address: z.object({
      full_name: z.string().min(1),
      phone: z.string().nullable().optional(),
      city: z.string().min(1),
      line1: z.string().nullable().optional(),
    }),
  }),
});

r.get(
  "/buyer/:buyerId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const buyerOid = coerceToObjectId(req.params.buyerId) ?? req.params.buyerId;
    if (String(req.user.sub) !== String(buyerOid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    ok(res, await Order.find({ buyer_id: buyerOid }).sort("-created_at"));
  })
);

r.get(
  "/seller/:sellerId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sellerOid = coerceToObjectId(req.params.sellerId) ?? req.params.sellerId;
    if (String(req.user.sub) !== String(sellerOid)) return res.status(403).json({ error: "Not authorized" });
    ok(res, await Order.find({ seller_id: sellerOid }).sort("-created_at"));
  })
);

r.post(
  "/checkout/:buyerId",
  requireAuth,
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const buyerOid = coerceToObjectId(req.params.buyerId) ?? req.params.buyerId;
    if (String(req.user.sub) !== String(buyerOid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const itemIds = req.input.body.items || null;
    const out = await createOrderFromCart({
      buyerId: buyerOid,
      address: req.input.body.address,
      payment_method: req.input.body.payment_method,
      items: itemIds,
      isQuick: req.input.body.isQuick || false  
    });
    ok(res, out);
  })
);

// Initiate payment for order
r.post(
  "/:id/payment",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await createPaymentForOrder(req.params.id);
    ok(res, payment);
  })
);

// Confirm payment (mock webhook/callback)
r.post(
  "/:id/payment/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await confirmPayment(req.params.id);
    ok(res, result);
  })
);

r.post(
  "/payment-webhook",
  asyncHandler(handleWebhookEndpoint)
);

// Get order history
r.get(
  "/:id/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // buyer or seller can fetch history
    const uid = req.user.sub;
    const isSeller = Array.isArray(order.seller_id) && order.seller_id.map(String).includes(String(uid));
    // convert buyer_id to string for comparison; seller_id may be array
    if (order.buyer_id.toString() !== String(uid) && !isSeller) {
      return res.status(403).json({ error: "Not authorized" });
    }

    ok(res, order.history || []);
  })
);

// Update statuses (only seller allowed)
r.post(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

  const uid = req.user.sub;
  const isSeller = Array.isArray(order.seller_id) && order.seller_id.map(String).includes(String(uid));
    if (!isSeller) return res.status(403).json({ error: "Not authorized" });

    const { order_status, payment_status, shipping_status, note } = req.body;
    const updates = {};
    const now = new Date();
    order.history = order.history || [];

    if (order_status && order_status !== order.order_status) {
      order.history.push({
        at: now,
        by: req.user.sub,
        action: "order_status_changed",
        from: order.order_status,
        to: order_status,
        note: note || undefined,
      });
      updates.order_status = order_status;
      order.order_status = order_status;
    }
    if (payment_status && payment_status !== order.payment_status) {
      order.history.push({
        at: now,
        by: req.user.sub,
        action: "payment_status_changed",
        from: order.payment_status,
        to: payment_status,
        note: note || undefined,
      });
      updates.payment_status = payment_status;
      order.payment_status = payment_status;
    }
    if (shipping_status && shipping_status !== order.shipping_status) {
      order.history.push({
        at: now,
        by: req.user.sub,
        action: "shipping_status_changed",
        from: order.shipping_status,
        to: shipping_status,
        note: note || undefined,
      });
      updates.shipping_status = shipping_status;
      order.shipping_status = shipping_status;
    }

    await order.save();
    ok(res, order);
  })
);

// simulate payment in development
if (process.env.NODE_ENV === "development") {
  r.post(
    "/:id/simulate-payment",
    requireAuth,
    asyncHandler(async (req, res) => {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      // create payment record if not exists
      const { createPaymentForOrder } = await import("../services/paymentService.js");
      let payment;
      try {
        payment = await createPaymentForOrder(req.params.id);
      } catch (e) {
        // ignore if exists
      }

      // call confirmPayment directly to simulate webhook
      const { confirmPayment } = await import("../services/paymentService.js");
      const result = await confirmPayment(req.params.id);
      ok(res, { message: "simulated", result });
    })
  );
}

r.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Query params: buyerId OR sellerId required; optional: status, page, limit, sort
  const { buyerId, sellerId, status, page = "1", limit = "20", sort = "-created_at" } = req.query;

    if (!buyerId && !sellerId) {
      return res.status(400).json({ error: "buyerId or sellerId query parameter is required" });
    }

    // Authorization: only allow listing for the authenticated user
    const q = {};
    if (buyerId) {
      const b = coerceToObjectId(buyerId) ?? buyerId;
      if (String(req.user.sub) !== String(b)) return res.status(403).json({ error: "Not authorized for buyerId" });
      q.buyer_id = b;
    }
    if (sellerId) {
      const s = coerceToObjectId(sellerId) ?? sellerId;
      if (String(req.user.sub) !== String(s)) return res.status(403).json({ error: "Not authorized for sellerId" });
      q.seller_id = s;
    }
    if (status) q.order_status = status;

    const p = Math.max(1, parseInt(String(page) || "1", 10));
    const lim = Math.min(100, Math.max(1, parseInt(String(limit) || "20", 10)));
    const skip = (p - 1) * lim;

    const total = await Order.countDocuments(q);
    const docs = await Order.find(q).sort(sort).skip(skip).limit(lim);

    ok(res, { data: docs, meta: { total, page: p, limit: lim } });
  })
);

// Get order detail
r.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only buyer or seller may see details
    const uid = req.user.sub;
    if (order.buyer_id.toString() !== uid && order.seller_id.toString() !== uid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    ok(res, order);
  })
);

// Buyer cancel order
r.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // only buyer may cancel
    if (order.buyer_id.toString() !== req.user.sub) return res.status(403).json({ error: "Not authorized" });

    // disallow cancel if already completed or already canceled
    if (["completed", "canceled"].includes(order.order_status)) {
      return res.status(400).json({ error: "Cannot cancel this order" });
    }

    // update statuses and history
    const now = new Date();
    order.history = order.history || [];
    order.history.push({
      at: now,
      by: req.user.sub,
      action: "buyer_cancel",
      note: req.body?.note || "Buyer cancelled the order",
    });

    order.order_status = "canceled";
    // if payment still pending keep as pending (so backend can ignore), else keep existing
    if (!order.payment_status || order.payment_status === "pending") {
      order.payment_status = "canceled";
    }

    await order.save();
    ok(res, order);
  })
);

// Buyer confirm received
r.post(
  "/:id/receive",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // only buyer may confirm receive
    if (order.buyer_id.toString() !== req.user.sub) return res.status(403).json({ error: "Not authorized" });

    // cannot confirm if already completed
    if (order.order_status === "completed") {
      return res.status(400).json({ error: "Order already completed" });
    }

    const now = new Date();
    order.history = order.history || [];
    order.history.push({
      at: now,
      by: req.user.sub,
      action: "buyer_confirm_received",
      note: req.body?.note || "Buyer confirmed receipt",
    });

    order.shipping_status = "delivered";
    order.order_status = "completed";
    // mark payment paid if COD and pending
    if ((order.payment_method === "cod" || order.payment_method === "COD") && order.payment_status === "pending") {
      order.payment_status = "paid";
    }

    await order.save();
    ok(res, order);
  })
);

export default r;
