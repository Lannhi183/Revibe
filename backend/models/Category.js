import { Schema, model, baseOpts } from './_helpers.js';

const CategorySchema = new Schema({
  type: { type: String, required: true, enum: ['category', 'brand', 'condition', 'size', 'material', 'color', 'fit', 'gender', 'season', 'pattern'] },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  color: { type: String, default: '#0d6efd' },
  usageCount: { type: Number, default: 0 },

  // Legacy fields (keep for backward compatibility)
  parent_id: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
  path: [String],
  attributes: [{ key: String, type: String, values: [String] }]
}, baseOpts);

export const Category = model('Category', CategorySchema);
