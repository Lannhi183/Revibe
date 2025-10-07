import { Listing } from "../models/Listing.js";

export async function getListings({ q, minPrice, maxPrice, sort = "-created_at" }) {
  const where = { status: "active", is_deleted: false };

  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { $gte: Number(minPrice) } : {}),
      ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
    };
  }

  let cursor = Listing.find(where);

  if (q) cursor = cursor.find({ $text: { $search: q } });
  cursor = cursor.sort(sort).limit(60);

  return cursor.exec();
}

export async function getListingById(id) {
  const doc = await Listing.findById(id);
  if (!doc || doc.is_deleted) return null;
  return doc;
}
