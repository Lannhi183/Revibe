import { Schema, model, baseOpts } from './_helpers.js';
const CategorySchema = new Schema({
slug: { type: String, required: true, unique: true, index: true },
name: { type: String, required: true },
parent_id: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
path: [String],
attributes: [{ key: String, type: String, values: [String] }]
}, baseOpts);
export const Category = model('Category', CategorySchema);