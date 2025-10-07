import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { coerceToObjectId, coerceArrayToObjectId } from "../utils/idCoerce.js";

function calcAmounts(items, isQuick = false) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = isQuick ? 30000 : 0;
  const fee = subtotal * 0.1;
  const discount = 0;
  return {
    subtotal,
    shipping,
    fee,
    discount,
    total: subtotal + shipping + fee - discount,
  };
}

export async function createOrderFromCart({
  buyerId,
  address,
  payment_method = "online",
  itemIds = null,
  isQuick = false,
}) {
  // 1) load cart
  const buyerOid = coerceToObjectId(buyerId) ?? buyerId;
  const cart = await Cart.findOne({ buyer_id: buyerOid });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error("Cart empty");
  }

  // 2) pick items either by provided itemIds or whole cart
  let selectedItems;
  if (Array.isArray(itemIds) && itemIds.length > 0) {
    // item ids may be stored as _id or listing_id depending on shape; match by _id or listing_id
    const idSet = new Set(itemIds.map(String));
    selectedItems = cart.items.filter(
      (it) => idSet.has(String(it._id || it.id || it.listing_id))
    );
  } else {
    selectedItems = cart.items.slice();
  }

  if (!selectedItems.length) throw new Error("No items selected from cart");

  // 3) collect unique seller ids across items (support multi-seller)
  const sellerSet = new Set();
  selectedItems.forEach((i) => {
    const sid = i.seller_id || i.sellerId || i.seller || null;
    if (sid) sellerSet.add(String(sid));
  });
  const sellerIds = Array.from(sellerSet).map((s) => coerceToObjectId(s) ?? s);

  // 4) build order items and amounts
  const itemsForOrder = selectedItems.map((i) => ({
    listing_id: coerceToObjectId(i.listing_id || i._id || i.id) ?? (i.listing_id || i._id || i.id),
  seller_id: (coerceToObjectId(i.seller_id || i.sellerId || i.seller) ?? (i.seller_id || i.sellerId || i.seller)) || null,
    title: i.title,
    image: i.image,
    qty: i.qty,
    price: i.price,
  }));
  const amounts = calcAmounts(itemsForOrder);

  // 5) create order and payment (non-transactional)
  const [order] = await Order.create([
    {
      buyer_id: buyerOid,
      seller_id: coerceArrayToObjectId(sellerIds),
      order_status: payment_method === "cod" ? "processing" : "pending",
      payment_status: "pending",
      shipping_status: "pending",
      items: itemsForOrder,
      amounts,
      currency: "VND",
      shipping_address: address,
      payment_method,
    },
  ]);

  const [payment] = await Payment.create([
    {
      order_id: order._id,
      method: payment_method,
      provider: payment_method === "online" ? "manual_vietqr" : "cod",
      amount: amounts.total,
      currency: "VND",
      status: "pending",
    },
  ]);

  // 6) remove selected items from cart and save
  // Remove by matching listing_id or _id
  const selectedKeySet = new Set(selectedItems.map((it) => String(it._id || it.id || it.listing_id)));
  cart.items = (cart.items || []).filter(
    (it) => !selectedKeySet.has(String(it._id || it.id || it.listing_id))
  );
  await cart.save();

  return { order, payment };
}
