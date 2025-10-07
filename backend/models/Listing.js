import { Schema, model, baseOpts } from "./_helpers.js";
const ListingSchema = new Schema(
  {
    seller_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    title: { type: String, required: true },
    description: String,
    images: [String],
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["VND"], default: "VND" },
    attributes: {
      type: new Schema(
        {
          size: String,
          brand: String,
          color: String,
          condition: String,
          style_tags: [String],
        },
        { _id: false }
      ),
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_review",
        "active",
        "paused",
        "sold",
        "removed",
        "rejected",
      ],
      default: "draft",
      index: true,
    },
    moderation: {
      type: new Schema(
        {
          state: String,
          reviewer_id: { type: Schema.Types.ObjectId, ref: "User" },
          reason: String,
          history: [
            {
              at: Date,
              action: String,
              by: { type: Schema.Types.ObjectId, ref: "User" },
            },
          ],
        },
        { _id: false }
      ),
    },
    metrics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
    location: String,
    is_deleted: { type: Boolean, default: false },
  },
  baseOpts
);
ListingSchema.index({ status: 1, created_at: -1 });
ListingSchema.index({ category_id: 1, price: 1 });
ListingSchema.index({ title: "text", description: "text" });
export const Listing = model("Listing", ListingSchema);
