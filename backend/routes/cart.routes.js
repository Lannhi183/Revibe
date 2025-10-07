import { Router } from "express";
import { Cart } from "../models/Cart.js";
import { coerceToObjectId } from "../utils/idCoerce.js";
import { ok } from "../utils/response.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";

const r = Router();

// Schema validation
const addItemSchema = z.object({
  body: z.object({
    item: z.object({
      listing_id: z.string(),
      seller_id: z.string(),
      title: z.string(),
      image: z.string().nullable().optional(),
      qty: z.number().int().positive(),
      price: z.number().positive()
    })
  })
});

const updateItemSchema = z.object({
  body: z.object({
    idx: z.number().int().nonnegative(),
    qty: z.number().int().positive()
  })
});

const removeItemSchema = z.object({
  body: z.object({
    idx: z.number().int().nonnegative()
  })
});

// Get cart
r.get(
  "/my-cart",
  requireAuth,
  asyncHandler(async (req, res) => {
  const buyerOid = coerceToObjectId(req.user.sub) ?? req.user.sub;
  const cart = await Cart.findOne({ buyer_id: buyerOid });
  ok(res, cart || { buyer_id: buyerOid, items: [] });
  })
);

// Add item to cart
r.post(
  "/add",
  requireAuth,
  validate(addItemSchema),
  asyncHandler(async (req, res) => {
    const { item } = req.body;
  const buyerIdRaw = req.user.sub;
  const buyerId = coerceToObjectId(buyerIdRaw) ?? buyerIdRaw;

  // Tìm cart hiện tại
  let cart = await Cart.findOne({ buyer_id: buyerId });

    if (!cart) {
      // Nếu chưa có cart thì tạo mới luôn
      cart = await Cart.create({
        buyer_id: buyerId,
        items: [item],
      });
      return ok(res, cart);
    }

    // Tìm item trong cart có cùng listing_id và cùng price
    const existingItem = cart.items.find(
      (i) =>
        i.listing_id.toString() === item.listing_id &&
        i.price === item.price
    );

    if (existingItem) {
      // Nếu đã tồn tại thì +1 số lượng
      existingItem.qty += item.qty || 1;
    } else {
      // Nếu chưa có thì thêm item mới
      cart.items.push(item);
    }

    cart.updated_at = new Date();
    await cart.save();

    ok(res, cart);
  })
);

// Update item quantity
r.put(
  "/update",
  requireAuth,
  validate(updateItemSchema),
  asyncHandler(async (req, res) => {
    const { idx, qty } = req.body;
    const cart = await Cart.findOne({ buyer_id: req.user.sub });
    
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    if (!cart.items[idx]) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    cart.items[idx].qty = qty;
    await cart.save();
    ok(res, cart);
  })
);

// Remove item from cart
r.delete(
  "/remove",
  requireAuth,
  validate(removeItemSchema),
  asyncHandler(async (req, res) => {
    const { idx } = req.body;
    const cart = await Cart.findOne({ buyer_id: req.user.sub });
    
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    if (!cart.items[idx]) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    cart.items.splice(idx, 1);
    await cart.save();
    ok(res, cart);
  })
);

// Clear cart
r.delete(
  "/clear",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await Cart.findOneAndUpdate(
      { buyer_id: req.user.sub },
      { $set: { items: [] } },
      { new: true }
    );
    ok(res, cart);
  })
);

export default r;