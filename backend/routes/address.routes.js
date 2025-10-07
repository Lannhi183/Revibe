import { Router } from "express";
import { z } from "zod";
import { Address } from "../models/Address.js";
import { ok, created } from "../utils/response.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validate } from "../middlewares/validate.js";

const r = Router();

const createSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    full_name: z.string().min(1),
    phone: z.string().min(6),
    line1: z.string().min(1),
    line2: z.string().optional(),
    ward: z.string().optional(),
    district: z.string().optional(),
    city: z.string().min(1),
    country: z.string().optional().default("VN"),
    is_default: z.boolean().optional().default(false),
  }),
});

const updateSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    ward: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    is_default: z.boolean().optional(),
  }),
});

// List addresses for current user
r.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const list = await Address.find({ user_id: req.user.sub }).sort("-is_default -created_at");
    ok(res, list);
  })
);

// Create address
r.post(
  "/",
  requireAuth,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.input.body;
    // if is_default true, unset other defaults
    if (b.is_default) {
      await Address.updateMany({ user_id: req.user.sub, is_default: true }, { $set: { is_default: false } });
    }
    const doc = await Address.create({ user_id: req.user.sub, ...b });
    created(res, doc);
  })
);

// Get single address
r.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await Address.findById(req.params.id);
    if (!doc || String(doc.user_id) !== String(req.user.sub)) return res.status(404).json({ error: "Address not found" });
    ok(res, doc);
  })
);

// Update address
r.put(
  "/:id",
  requireAuth,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const doc = await Address.findById(req.params.id);
    if (!doc || String(doc.user_id) !== String(req.user.sub)) return res.status(404).json({ error: "Address not found" });
    const b = req.input.body;
    if (b.is_default) {
      await Address.updateMany({ user_id: req.user.sub, is_default: true }, { $set: { is_default: false } });
    }
    Object.assign(doc, b);
    await doc.save();
    ok(res, doc);
  })
);

// Delete address
r.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await Address.findById(req.params.id);
    if (!doc || String(doc.user_id) !== String(req.user.sub)) return res.status(404).json({ error: "Address not found" });
    await doc.remove();
    ok(res, { message: "deleted" });
  })
);

export default r;
