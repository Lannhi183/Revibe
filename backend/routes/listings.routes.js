import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { Listing } from "../models/Listing.js";
import { ok, created } from "../utils/response.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { coerceToObjectId } from "../utils/idCoerce.js";
import { uploadMultipleBase64ToCloudinary } from "../services/cloudinaryService.js";

const r = Router();

r.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, category_id, sort = "-created_at", minPrice, maxPrice, isYour, status } = req.query;

    // build flexible filter: if isYour === 'true' we return the seller's listings (any status unless status is explicitly provided)
    const where = {};

      // determine authenticated user id (support different shapes set by auth middleware)
      const authUserId = (req.user && (req.user.sub || req.user.id || req.user._id)) || null;

      if (isYour === "true") {
        where.seller_id = authUserId;
        if (status && status !== "all") where.status = status;
      } else {
      // non-owner listing view
      if (status && status !== "all") {
        where.status = status;
      } else if (req.user && req.user.role === "admin") {
        // admin: by default show all statuses (no status filter) when status not provided
      } else {
        // public/non-admin default: only active listings
        where.status = "active";
      }
    }

    if (category_id) where.category_id = category_id;
    if (minPrice || maxPrice)
      where.price = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
      };

    const cursor = Listing.find(where).sort(sort).limit(200);
    if (q) cursor.find({ $text: { $search: q } });

    // allow admin to request all statuses explicitly
    if (status === "all" && req.user && req.user.role === "admin") {
      // remove status filter so all listings are returned
      delete cursor._conditions.status;
    }

    // populate seller info for admin UI
    cursor.populate("seller_id", "name email");

    ok(res, await cursor.exec());
  })
);

const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    price: z.number().int().nonnegative(),
    currency: z.string().default("VND"),
    images: z.array(z.string()).default([]),
    attributes: z.record(z.any()).default({}),
    category_id: z.string().optional(),
  }),
});

r.post(
  "/",
  requireAuth,
  validate(createListingSchema),
  asyncHandler(async (req, res) => {
    const b = req.input.body;
    const authUserIdPost = (req.user && (req.user.sub || req.user.id || req.user._id)) || null;
    const sellerRaw = authUserIdPost ?? b.sellerId;
    const sellerId = coerceToObjectId(sellerRaw) ?? sellerRaw;

    // Upload images to Cloudinary if provided
    let cloudinaryUrls = [];
    if (b.images && b.images.length > 0) {
      console.log(`Uploading ${b.images.length} images to Cloudinary...`);
      cloudinaryUrls = await uploadMultipleBase64ToCloudinary(b.images, 'revibe/listings');
      console.log(`Upload completed: ${cloudinaryUrls.length} URLs`);
    }

    const doc = await Listing.create({
      seller_id: sellerId,
      title: b.title,
      price: b.price,
      currency: b.currency || "VND",
      images: cloudinaryUrls, // Store Cloudinary URLs instead of base64
      attributes: b.attributes,
      category_id: b.category_id,
      status: "pending_review",
    });
    created(res, doc);
  })
);

r.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    console.debug("[listings] GET /:id id=", id);

    // validate ObjectId early
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" , id});
    }

    try {
      // try standard findById first
      let listing = await Listing.findById(id).exec();

      // fallback: explicit findOne with ObjectId cast (some schemas/custom ids may require this)
      if (!listing) {
        const objId = new mongoose.Types.ObjectId(id);
        listing = await Listing.findOne({ _id: objId }).exec();
      }

      // extra fallback: if still not found, try searching by string _id (some schemas use string _id)
      if (!listing) {
        listing = await Listing.findOne({ _id: String(id) }).exec();
      }

      if (!listing) {
        console.warn("[listings] not found:", id);
        return res.status(404).json({ error: "Listing not found", id });
      }

      ok(res, listing);
    } catch (err) {
      console.error("[listings] GET /:id error", err);
      return res.status(500).json({ error: "Server error", detail: String(err) });
    }
  })
);
r.put(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true })
    );
  })
);
r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await Listing.findByIdAndUpdate(
        req.params.id,
        { is_deleted: true, status: "removed" },
        { new: true }
      )
    );
  })
);

export default r;
