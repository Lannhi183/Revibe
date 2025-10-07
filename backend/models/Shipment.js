import { Schema, model, baseOpts } from "./_helpers.js";
const ShipmentEvent = new Schema(
  { at: Date, code: String, note: String },
  { _id: false }
);
const ShipmentSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    carrier: String,
    tracking_no: { type: String, index: true },
    status: {
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
    events: [ShipmentEvent],
    address_from: { type: Schema.Types.Mixed },
    address_to: { type: Schema.Types.Mixed },
  },
  baseOpts
);
export const Shipment = model("Shipment", ShipmentSchema);
