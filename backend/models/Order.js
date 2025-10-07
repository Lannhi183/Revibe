import { Schema, model, baseOpts } from "./_helpers.js";
const OrderItem = new Schema(
  {
    listing_id: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    seller_id: { type: Schema.Types.ObjectId, ref: "User" },
    title: String,
    image: String,
    qty: { type: Number, default: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);
const Amounts = new Schema(
  {
    subtotal: Number,
    shipping: Number,
    fee: Number,
    discount: Number,
    total: Number,
  },
  { _id: false }
);

const OrderHistoryItem = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    action: String,
    from: String,
    to: String,
    note: String,
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    buyer_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    seller_id: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      index: true,
      required: true,
    },
    order_status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "canceled",
      ],
      default: "pending",
      index: true,
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled"],
      default: "pending",
    },
    shipping_status: {
      type: String,
      enum: [
        "pending",
        "label_created",
        "in_transit",
        "delivered",
        "returned",
        "lost",
      ],
      default: "pending",
    },
    items: { type: [OrderItem], required: true },
    amounts: { type: Amounts, required: true },
    currency: { type: String, enum: ["VND"], default: "VND" },
    shipping_address: { type: Schema.Types.Mixed },
    payment_method: { type: String, enum: ["online", "cod"], required: true },
    notes: String,
    history: { type: [OrderHistoryItem], default: [] },
  },
  baseOpts
);
OrderSchema.index({ buyer_id: 1, created_at: -1 });
OrderSchema.index({ seller_id: 1, created_at: -1 });
OrderSchema.index({ order_status: 1, updated_at: -1 });
export const Order = model("Order", OrderSchema);
