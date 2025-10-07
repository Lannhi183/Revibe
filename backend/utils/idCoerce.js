import mongoose from 'mongoose';

export function coerceToObjectId(val) {
  if (val == null) return null;
  if (typeof val === 'object' && val._bsontype === 'ObjectID') return val;
  const s = String(val);
  if (mongoose.Types.ObjectId.isValid(s)) return new mongoose.Types.ObjectId(s);
  return null;
}

export function coerceArrayToObjectId(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((v) => coerceToObjectId(v) ?? v);
}
